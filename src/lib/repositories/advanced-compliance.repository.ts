import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  ComplianceFrameworkId,
  ComplianceRequirementId,
  CompliancePolicyId,
  ComplianceAssessmentId,
  ComplianceFindingId,
  ComplianceViolationId,
  ComplianceTrainingId,
  UserId,
  OrganizationId,
  QueryOptions,
  PaginatedResult,
  createComplianceFrameworkId,
  createComplianceRequirementId,
  createCompliancePolicyId,
  createComplianceAssessmentId,
  createComplianceFindingId,
  createComplianceViolationId,
  createComplianceTrainingId,
  createUserId,
  createOrganizationId
} from '../../types/branded'
import type { Database } from '../../types/database'
import { z } from 'zod'

// ==========================================
// COMPLIANCE FRAMEWORK INTERFACES
// ==========================================

export interface ComplianceFramework {
  id: ComplianceFrameworkId
  name: string
  acronym: string
  description?: string
  version: string
  jurisdiction?: string
  industry?: string
  effective_date: string
  review_cycle_months: number
  is_active: boolean
  authority_body?: string
  reference_url?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ComplianceFrameworkRequirement {
  id: ComplianceRequirementId
  framework_id: ComplianceFrameworkId
  requirement_code: string
  title: string
  description: string
  category: string
  subcategory?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  compliance_type: 'mandatory' | 'recommended' | 'optional'
  evidence_requirements: string[]
  testing_frequency?: string
  control_type?: string
  automation_level?: string
  penalty_severity?: string
  related_requirements: ComplianceRequirementId[]
  implementation_guidance?: string
  testing_procedures?: string
  success_criteria?: string
  failure_indicators?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompliancePolicy {
  id: CompliancePolicyId
  organization_id: OrganizationId
  framework_id: ComplianceFrameworkId
  title: string
  policy_code: string
  version: string
  status: 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived'
  effective_date?: string
  expiry_date?: string
  review_date?: string
  content: string
  summary?: string
  scope?: string
  roles_responsibilities: Record<string, any>
  implementation_steps: Array<any>
  monitoring_procedures: Record<string, any>
  violation_procedures: Record<string, any>
  training_requirements: Record<string, any>
  approval_chain: UserId[]
  approved_by?: UserId
  approved_at?: string
  created_by: UserId
  parent_policy_id?: CompliancePolicyId
  tags: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ComplianceAssessment {
  id: ComplianceAssessmentId
  organization_id: OrganizationId
  framework_id: ComplianceFrameworkId
  title: string
  assessment_type: 'self' | 'internal_audit' | 'external_audit' | 'regulatory_exam' | 'continuous'
  status: 'planned' | 'in_progress' | 'under_review' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  scope_description?: string
  assessment_period_start: string
  assessment_period_end: string
  planned_start_date: string
  planned_end_date: string
  actual_start_date?: string
  actual_end_date?: string
  lead_assessor_id?: UserId
  assessment_team: UserId[]
  external_assessor_info: Record<string, any>
  requirements_tested: ComplianceRequirementId[]
  overall_score?: number
  findings_count: number
  critical_findings: number
  high_findings: number
  medium_findings: number
  low_findings: number
  recommendations_count: number
  action_items_count: number
  executive_summary?: string
  methodology?: string
  testing_approach?: string
  limitations?: string
  next_assessment_date?: string
  certificate_issued: boolean
  certificate_expiry?: string
  cost_estimate?: number
  actual_cost?: number
  vendor_info: Record<string, any>
  created_by: UserId
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ComplianceAssessmentFinding {
  id: ComplianceFindingId
  assessment_id: ComplianceAssessmentId
  requirement_id?: ComplianceRequirementId
  finding_type: 'violation' | 'deficiency' | 'weakness' | 'observation' | 'best_practice'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  evidence?: string
  impact_assessment?: string
  root_cause_analysis?: string
  recommendation: string
  management_response?: string
  remediation_plan?: string
  responsible_party?: UserId
  target_completion_date?: string
  actual_completion_date?: string
  verification_method?: string
  verification_date?: string
  verified_by?: UserId
  status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'deferred'
  business_impact?: string
  regulatory_impact?: string
  financial_impact?: number
  likelihood?: 'low' | 'medium' | 'high' | 'very_high'
  related_findings: ComplianceFindingId[]
  attachments: Array<any>
  follow_up_required: boolean
  escalation_required: boolean
  external_reporting_required: boolean
  created_by: UserId
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ComplianceViolation {
  id: ComplianceViolationId
  organization_id: OrganizationId
  framework_id?: ComplianceFrameworkId
  requirement_id?: ComplianceRequirementId
  policy_id?: CompliancePolicyId
  violation_code: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  subcategory?: string
  detected_date: string
  detection_method?: string
  detected_by?: UserId
  incident_date?: string
  incident_duration_hours?: number
  affected_systems: string[]
  affected_users: number
  affected_records: number
  data_types_affected: string[]
  root_cause?: string
  contributing_factors?: string
  immediate_actions?: string
  containment_actions?: string
  remediation_plan: string
  prevention_measures?: string
  lessons_learned?: string
  responsible_party?: UserId
  target_resolution_date?: string
  actual_resolution_date?: string
  resolution_summary?: string
  status: 'identified' | 'investigating' | 'remediating' | 'resolved' | 'closed'
  business_impact?: string
  financial_impact?: number
  regulatory_reporting_required: boolean
  regulatory_notifications: Array<any>
  legal_review_required: boolean
  legal_review_status?: string
  insurance_claim_filed: boolean
  insurance_claim_amount?: number
  customer_notification_required: boolean
  customers_notified: number
  media_attention: boolean
  recurrence_prevention: Record<string, any>
  follow_up_actions: Array<any>
  related_violations: ComplianceViolationId[]
  evidence_ids: string[]
  created_by: UserId
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ComplianceTraining {
  id: ComplianceTrainingId
  organization_id: OrganizationId
  framework_id?: ComplianceFrameworkId
  title: string
  description?: string
  training_type: 'mandatory' | 'recommended' | 'optional' | 'certification'
  delivery_method: 'online' | 'instructor_led' | 'blended' | 'self_study'
  duration_minutes: number
  validity_months: number
  prerequisites: string[]
  learning_objectives: string[]
  content_url?: string
  assessment_required: boolean
  passing_score: number
  max_attempts: number
  target_roles: string[]
  target_departments: string[]
  mandatory_for_roles: string[]
  created_by: UserId
  is_active: boolean
  version: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserComplianceTraining {
  id: string
  user_id: UserId
  training_id: ComplianceTrainingId
  organization_id: OrganizationId
  assigned_date: string
  due_date: string
  started_at?: string
  completed_at?: string
  status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'expired' | 'waived'
  progress_percentage: number
  time_spent_minutes: number
  attempts: number
  best_score?: number
  latest_score?: number
  passed: boolean
  certificate_issued: boolean
  certificate_expiry_date?: string
  assigned_by?: UserId
  waived_by?: UserId
  waived_reason?: string
  notes?: string
  reminder_sent_count: number
  last_reminder_sent?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// ==========================================
// CREATE DATA INTERFACES
// ==========================================

export interface CreateCompliancePolicyData {
  organization_id: OrganizationId
  framework_id: ComplianceFrameworkId
  title: string
  policy_code: string
  version?: string
  content: string
  summary?: string
  scope?: string
  roles_responsibilities?: Record<string, any>
  implementation_steps?: Array<any>
  monitoring_procedures?: Record<string, any>
  violation_procedures?: Record<string, any>
  training_requirements?: Record<string, any>
  approval_chain?: UserId[]
  tags?: string[]
  metadata?: Record<string, any>
}

export interface CreateComplianceAssessmentData {
  organization_id: OrganizationId
  framework_id: ComplianceFrameworkId
  title: string
  assessment_type: ComplianceAssessment['assessment_type']
  priority?: ComplianceAssessment['priority']
  scope_description?: string
  assessment_period_start: Date
  assessment_period_end: Date
  planned_start_date: Date
  planned_end_date: Date
  lead_assessor_id?: UserId
  assessment_team?: UserId[]
  external_assessor_info?: Record<string, any>
  requirements_tested?: ComplianceRequirementId[]
  methodology?: string
  testing_approach?: string
  cost_estimate?: number
  vendor_info?: Record<string, any>
  metadata?: Record<string, any>
}

export interface CreateComplianceViolationData {
  organization_id: OrganizationId
  framework_id?: ComplianceFrameworkId
  requirement_id?: ComplianceRequirementId
  policy_id?: CompliancePolicyId
  violation_code: string
  title: string
  description: string
  severity: ComplianceViolation['severity']
  category: string
  subcategory?: string
  detected_date: Date
  detection_method?: string
  incident_date?: Date
  incident_duration_hours?: number
  affected_systems?: string[]
  affected_users?: number
  affected_records?: number
  data_types_affected?: string[]
  root_cause?: string
  remediation_plan: string
  responsible_party?: UserId
  target_resolution_date?: Date
  business_impact?: string
  financial_impact?: number
  regulatory_reporting_required?: boolean
  legal_review_required?: boolean
  customer_notification_required?: boolean
  metadata?: Record<string, any>
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const CreateCompliancePolicySchema = z.object({
  organization_id: z.string().transform(v => createOrganizationId(v)),
  framework_id: z.string().transform(v => createComplianceFrameworkId(v)),
  title: z.string().min(1).max(500),
  policy_code: z.string().min(1).max(100),
  version: z.string().max(50).default('1.0'),
  content: z.string().min(1),
  summary: z.string().max(2000).optional(),
  scope: z.string().max(2000).optional(),
  roles_responsibilities: z.record(z.any()).default({}),
  implementation_steps: z.array(z.any()).default([]),
  monitoring_procedures: z.record(z.any()).default({}),
  violation_procedures: z.record(z.any()).default({}),
  training_requirements: z.record(z.any()).default({}),
  approval_chain: z.array(z.string()).default([]).transform(ids =>
    ids.map(id => createUserId(id)).filter(result => result.success).map(result => result.data!)
  ),
  tags: z.array(z.string().max(50)).default([]),
  metadata: z.record(z.any()).default({})
})

const CreateComplianceAssessmentSchema = z.object({
  organization_id: z.string().transform(v => createOrganizationId(v)),
  framework_id: z.string().transform(v => createComplianceFrameworkId(v)),
  title: z.string().min(1).max(500),
  assessment_type: z.enum(['self', 'internal_audit', 'external_audit', 'regulatory_exam', 'continuous']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  scope_description: z.string().max(2000).optional(),
  assessment_period_start: z.date(),
  assessment_period_end: z.date(),
  planned_start_date: z.date(),
  planned_end_date: z.date(),
  lead_assessor_id: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  assessment_team: z.array(z.string()).default([]).transform(ids =>
    ids.map(id => createUserId(id)).filter(result => result.success).map(result => result.data!)
  ),
  external_assessor_info: z.record(z.any()).default({}),
  requirements_tested: z.array(z.string()).default([]).transform(ids =>
    ids.map(id => createComplianceRequirementId(id)).filter(result => result.success).map(result => result.data!)
  ),
  methodology: z.string().max(5000).optional(),
  testing_approach: z.string().max(5000).optional(),
  cost_estimate: z.number().nonnegative().optional(),
  vendor_info: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({})
}).refine(data => data.assessment_period_end >= data.assessment_period_start, {
  message: "Assessment period end must be after start date"
}).refine(data => data.planned_end_date >= data.planned_start_date, {
  message: "Planned end date must be after start date"
})

const CreateComplianceViolationSchema = z.object({
  organization_id: z.string().transform(v => createOrganizationId(v)),
  framework_id: z.string().optional().transform(v => v ? createComplianceFrameworkId(v) : undefined),
  requirement_id: z.string().optional().transform(v => v ? createComplianceRequirementId(v) : undefined),
  policy_id: z.string().optional().transform(v => v ? createCompliancePolicyId(v) : undefined),
  violation_code: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  detected_date: z.date(),
  detection_method: z.string().max(100).optional(),
  incident_date: z.date().optional(),
  incident_duration_hours: z.number().nonnegative().optional(),
  affected_systems: z.array(z.string().max(255)).default([]),
  affected_users: z.number().nonnegative().default(0),
  affected_records: z.number().nonnegative().default(0),
  data_types_affected: z.array(z.string().max(100)).default([]),
  root_cause: z.string().max(2000).optional(),
  remediation_plan: z.string().min(1),
  responsible_party: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  target_resolution_date: z.date().optional(),
  business_impact: z.string().max(2000).optional(),
  financial_impact: z.number().nonnegative().optional(),
  regulatory_reporting_required: z.boolean().default(false),
  legal_review_required: z.boolean().default(false),
  customer_notification_required: z.boolean().default(false),
  metadata: z.record(z.any()).default({})
})

// ==========================================
// REPOSITORY CLASS
// ==========================================

export class AdvancedComplianceRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'ComplianceFramework'
  }

  protected getSearchFields(): string[] {
    return ['name', 'acronym', 'description', 'title']
  }

  // ==========================================
  // COMPLIANCE FRAMEWORK METHODS
  // ==========================================

  async findAllFrameworks(
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceFramework>>> {
    let query = this.supabase
      .from('compliance_frameworks')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('name', { ascending: true })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async findFrameworkById(id: ComplianceFrameworkId): Promise<Result<ComplianceFramework>> {
    const { data, error } = await this.supabase
      .from('compliance_frameworks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    return this.createResult(data, error, 'findFrameworkById')
  }

  async findFrameworkByAcronym(acronym: string): Promise<Result<ComplianceFramework | null>> {
    const { data, error } = await this.supabase
      .from('compliance_frameworks')
      .select('*')
      .eq('acronym', acronym)
      .eq('is_active', true)
      .single()

    if (error?.code === 'PGRST116') {
      return success(null) // Not found
    }

    return this.createResult(data, error, 'findFrameworkByAcronym')
  }

  async findFrameworkRequirements(
    frameworkId: ComplianceFrameworkId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceFrameworkRequirement>>> {
    let query = this.supabase
      .from('compliance_framework_requirements')
      .select('*', { count: 'exact' })
      .eq('framework_id', frameworkId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('category', { ascending: true })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  // ==========================================
  // COMPLIANCE POLICY METHODS
  // ==========================================

  async createCompliancePolicy(
    policyData: CreateCompliancePolicyData,
    createdBy: UserId
  ): Promise<Result<CompliancePolicy>> {
    const validation = CreateCompliancePolicySchema.safeParse(policyData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      organization_id: validatedData.organization_id.success ? validatedData.organization_id.data : undefined,
      framework_id: validatedData.framework_id.success ? validatedData.framework_id.data : undefined,
      title: validatedData.title,
      policy_code: validatedData.policy_code,
      version: validatedData.version,
      status: 'draft' as const,
      content: validatedData.content,
      summary: validatedData.summary,
      scope: validatedData.scope,
      roles_responsibilities: validatedData.roles_responsibilities,
      implementation_steps: validatedData.implementation_steps,
      monitoring_procedures: validatedData.monitoring_procedures,
      violation_procedures: validatedData.violation_procedures,
      training_requirements: validatedData.training_requirements,
      approval_chain: validatedData.approval_chain || [],
      created_by: createdBy,
      tags: validatedData.tags,
      metadata: validatedData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_policies')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createCompliancePolicy')
  }

  async findPoliciesByOrganization(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<CompliancePolicy>>> {
    let query = this.supabase
      .from('compliance_policies')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (frameworkId) {
      query = query.eq('framework_id', frameworkId)
    }

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async approvePolicyVersion(
    policyId: CompliancePolicyId,
    approvedBy: UserId,
    effectiveDate?: Date
  ): Promise<Result<CompliancePolicy>> {
    const updateData = {
      status: 'approved' as const,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      effective_date: effectiveDate?.toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_policies')
      .update(updateData)
      .eq('id', policyId)
      .select()
      .single()

    return this.createResult(data, error, 'approvePolicyVersion')
  }

  // ==========================================
  // COMPLIANCE ASSESSMENT METHODS
  // ==========================================

  async createComplianceAssessment(
    assessmentData: CreateComplianceAssessmentData,
    createdBy: UserId
  ): Promise<Result<ComplianceAssessment>> {
    const validation = CreateComplianceAssessmentSchema.safeParse(assessmentData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      organization_id: validatedData.organization_id.success ? validatedData.organization_id.data : undefined,
      framework_id: validatedData.framework_id.success ? validatedData.framework_id.data : undefined,
      title: validatedData.title,
      assessment_type: validatedData.assessment_type,
      status: 'planned' as const,
      priority: validatedData.priority,
      scope_description: validatedData.scope_description,
      assessment_period_start: validatedData.assessment_period_start.toISOString(),
      assessment_period_end: validatedData.assessment_period_end.toISOString(),
      planned_start_date: validatedData.planned_start_date.toISOString(),
      planned_end_date: validatedData.planned_end_date.toISOString(),
      lead_assessor_id: validatedData.lead_assessor_id?.success ? validatedData.lead_assessor_id.data : undefined,
      assessment_team: validatedData.assessment_team || [],
      external_assessor_info: validatedData.external_assessor_info,
      requirements_tested: validatedData.requirements_tested || [],
      findings_count: 0,
      critical_findings: 0,
      high_findings: 0,
      medium_findings: 0,
      low_findings: 0,
      recommendations_count: 0,
      action_items_count: 0,
      methodology: validatedData.methodology,
      testing_approach: validatedData.testing_approach,
      certificate_issued: false,
      cost_estimate: validatedData.cost_estimate,
      vendor_info: validatedData.vendor_info,
      created_by: createdBy,
      metadata: validatedData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createComplianceAssessment')
  }

  async findAssessmentsByOrganization(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId,
    status?: ComplianceAssessment['status'],
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceAssessment>>> {
    let query = this.supabase
      .from('compliance_assessments')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('planned_start_date', { ascending: false })

    if (frameworkId) {
      query = query.eq('framework_id', frameworkId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async startAssessment(
    assessmentId: ComplianceAssessmentId,
    startedBy: UserId
  ): Promise<Result<ComplianceAssessment>> {
    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .update({
        status: 'in_progress',
        actual_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    return this.createResult(data, error, 'startAssessment')
  }

  async completeAssessment(
    assessmentId: ComplianceAssessmentId,
    completedBy: UserId,
    overallScore?: number,
    executiveSummary?: string
  ): Promise<Result<ComplianceAssessment>> {
    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .update({
        status: 'completed',
        actual_end_date: new Date().toISOString(),
        overall_score: overallScore,
        executive_summary: executiveSummary,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    return this.createResult(data, error, 'completeAssessment')
  }

  // ==========================================
  // COMPLIANCE VIOLATION METHODS
  // ==========================================

  async createComplianceViolation(
    violationData: CreateComplianceViolationData,
    createdBy: UserId
  ): Promise<Result<ComplianceViolation>> {
    const validation = CreateComplianceViolationSchema.safeParse(violationData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      organization_id: validatedData.organization_id.success ? validatedData.organization_id.data : undefined,
      framework_id: validatedData.framework_id?.success ? validatedData.framework_id.data : undefined,
      requirement_id: validatedData.requirement_id?.success ? validatedData.requirement_id.data : undefined,
      policy_id: validatedData.policy_id?.success ? validatedData.policy_id.data : undefined,
      violation_code: validatedData.violation_code,
      title: validatedData.title,
      description: validatedData.description,
      severity: validatedData.severity,
      category: validatedData.category,
      subcategory: validatedData.subcategory,
      detected_date: validatedData.detected_date.toISOString().split('T')[0],
      detection_method: validatedData.detection_method,
      incident_date: validatedData.incident_date?.toISOString().split('T')[0],
      incident_duration_hours: validatedData.incident_duration_hours,
      affected_systems: validatedData.affected_systems,
      affected_users: validatedData.affected_users,
      affected_records: validatedData.affected_records,
      data_types_affected: validatedData.data_types_affected,
      root_cause: validatedData.root_cause,
      remediation_plan: validatedData.remediation_plan,
      responsible_party: validatedData.responsible_party?.success ? validatedData.responsible_party.data : undefined,
      target_resolution_date: validatedData.target_resolution_date?.toISOString().split('T')[0],
      status: 'identified' as const,
      business_impact: validatedData.business_impact,
      financial_impact: validatedData.financial_impact,
      regulatory_reporting_required: validatedData.regulatory_reporting_required,
      regulatory_notifications: [],
      legal_review_required: validatedData.legal_review_required,
      insurance_claim_filed: false,
      customer_notification_required: validatedData.customer_notification_required,
      customers_notified: 0,
      media_attention: false,
      recurrence_prevention: {},
      follow_up_actions: [],
      related_violations: [],
      evidence_ids: [],
      created_by: createdBy,
      metadata: validatedData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_violations')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createComplianceViolation')
  }

  async findViolationsByOrganization(
    organizationId: OrganizationId,
    filters: {
      frameworkId?: ComplianceFrameworkId
      severity?: ComplianceViolation['severity']
      status?: ComplianceViolation['status']
      category?: string
      dateFrom?: Date
      dateTo?: Date
    } = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceViolation>>> {
    let query = this.supabase
      .from('compliance_violations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('detected_date', { ascending: false })

    if (filters.frameworkId) {
      query = query.eq('framework_id', filters.frameworkId)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.dateFrom) {
      query = query.gte('detected_date', filters.dateFrom.toISOString().split('T')[0])
    }
    if (filters.dateTo) {
      query = query.lte('detected_date', filters.dateTo.toISOString().split('T')[0])
    }

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async updateViolationStatus(
    violationId: ComplianceViolationId,
    status: ComplianceViolation['status'],
    updatedBy: UserId,
    resolutionSummary?: string
  ): Promise<Result<ComplianceViolation>> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'resolved' && resolutionSummary) {
      updateData.resolution_summary = resolutionSummary
      updateData.actual_resolution_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await this.supabase
      .from('compliance_violations')
      .update(updateData)
      .eq('id', violationId)
      .select()
      .single()

    return this.createResult(data, error, 'updateViolationStatus')
  }

  // ==========================================
  // DASHBOARD AND ANALYTICS METHODS
  // ==========================================

  async getComplianceDashboard(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId
  ): Promise<Result<{
    assessments: {
      total: number
      completed: number
      inProgress: number
      planned: number
      overdue: number
    }
    violations: {
      total: number
      open: number
      critical: number
      resolved: number
      byCategory: Record<string, number>
    }
    policies: {
      total: number
      active: number
      needsReview: number
      draft: number
    }
    training: {
      assignedUsers: number
      completedUsers: number
      overdue: number
      completionRate: number
    }
    upcomingDeadlines: Array<{
      type: 'assessment' | 'policy_review' | 'training'
      title: string
      dueDate: string
      priority: string
    }>
  }>> {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Build base queries
    let assessmentQuery = this.supabase
      .from('compliance_assessments')
      .select('status, planned_end_date, actual_end_date, priority, title')
      .eq('organization_id', organizationId)

    let violationQuery = this.supabase
      .from('compliance_violations')
      .select('status, severity, category')
      .eq('organization_id', organizationId)

    let policyQuery = this.supabase
      .from('compliance_policies')
      .select('status, review_date, title')
      .eq('organization_id', organizationId)

    let trainingQuery = this.supabase
      .from('user_compliance_training')
      .select('status, due_date')
      .eq('organization_id', organizationId)

    // Apply framework filter if provided
    if (frameworkId) {
      assessmentQuery = assessmentQuery.eq('framework_id', frameworkId)
      violationQuery = violationQuery.eq('framework_id', frameworkId)
      policyQuery = policyQuery.eq('framework_id', frameworkId)
    }

    // Execute all queries in parallel
    const [assessmentResult, violationResult, policyResult, trainingResult] = await Promise.all([
      assessmentQuery,
      violationQuery,
      policyQuery,
      trainingQuery
    ])

    // Process assessment data
    const assessments = assessmentResult.data || []
    const assessmentStats = {
      total: assessments.length,
      completed: assessments.filter(a => a.status === 'completed').length,
      inProgress: assessments.filter(a => a.status === 'in_progress').length,
      planned: assessments.filter(a => a.status === 'planned').length,
      overdue: assessments.filter(a => 
        a.status !== 'completed' && 
        new Date(a.planned_end_date) < now
      ).length
    }

    // Process violation data
    const violations = violationResult.data || []
    const violationStats = {
      total: violations.length,
      open: violations.filter(v => ['identified', 'investigating', 'remediating'].includes(v.status)).length,
      critical: violations.filter(v => v.severity === 'critical').length,
      resolved: violations.filter(v => v.status === 'resolved').length,
      byCategory: violations.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Process policy data
    const policies = policyResult.data || []
    const policyStats = {
      total: policies.length,
      active: policies.filter(p => p.status === 'active').length,
      needsReview: policies.filter(p => 
        p.review_date && new Date(p.review_date) <= now
      ).length,
      draft: policies.filter(p => p.status === 'draft').length
    }

    // Process training data
    const trainings = trainingResult.data || []
    const trainingStats = {
      assignedUsers: trainings.length,
      completedUsers: trainings.filter(t => t.status === 'completed').length,
      overdue: trainings.filter(t => 
        t.status !== 'completed' && 
        new Date(t.due_date) < now
      ).length,
      completionRate: trainings.length > 0 
        ? (trainings.filter(t => t.status === 'completed').length / trainings.length) * 100 
        : 0
    }

    // Generate upcoming deadlines
    const upcomingDeadlines: any[] = []

    // Add assessment deadlines
    assessments
      .filter(a => 
        a.status !== 'completed' && 
        new Date(a.planned_end_date) <= thirtyDaysFromNow
      )
      .forEach(a => {
        upcomingDeadlines.push({
          type: 'assessment',
          title: a.title,
          dueDate: a.planned_end_date,
          priority: a.priority
        })
      })

    // Add policy review deadlines
    policies
      .filter(p => 
        p.review_date && 
        new Date(p.review_date) <= thirtyDaysFromNow
      )
      .forEach(p => {
        upcomingDeadlines.push({
          type: 'policy_review',
          title: `${p.title} Review`,
          dueDate: p.review_date,
          priority: 'medium'
        })
      })

    // Sort deadlines by due date
    upcomingDeadlines.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )

    return success({
      assessments: assessmentStats,
      violations: violationStats,
      policies: policyStats,
      training: trainingStats,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10) // Limit to 10 items
    })
  }

  async generateComplianceHealthScore(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId
  ): Promise<Result<{
    overallScore: number
    categoryScores: {
      assessments: number
      violations: number
      policies: number
      training: number
    }
    riskFactors: Array<{
      category: string
      impact: 'low' | 'medium' | 'high' | 'critical'
      description: string
      recommendation: string
    }>
    trend: 'improving' | 'stable' | 'declining'
  }>> {
    // This is a simplified implementation - in practice, you'd want more sophisticated scoring algorithms
    const dashboard = await this.getComplianceDashboard(organizationId, frameworkId)
    if (!dashboard.success) {
      return dashboard as any
    }

    const data = dashboard.data

    // Calculate category scores (0-100)
    const assessmentScore = data.assessments.total > 0 
      ? Math.max(0, 100 - (data.assessments.overdue / data.assessments.total) * 50) 
      : 50

    const violationScore = 100 - Math.min(100, 
      (data.violations.critical * 25) + 
      (data.violations.open * 10)
    )

    const policyScore = data.policies.total > 0
      ? (data.policies.active / data.policies.total) * 100
      : 50

    const trainingScore = data.training.completionRate

    const categoryScores = {
      assessments: Math.round(assessmentScore),
      violations: Math.round(violationScore),
      policies: Math.round(policyScore),
      training: Math.round(trainingScore)
    }

    const overallScore = Math.round(
      (categoryScores.assessments + categoryScores.violations + 
       categoryScores.policies + categoryScores.training) / 4
    )

    // Generate risk factors
    const riskFactors: any[] = []

    if (data.violations.critical > 0) {
      riskFactors.push({
        category: 'violations',
        impact: 'critical',
        description: `${data.violations.critical} critical violations require immediate attention`,
        recommendation: 'Prioritize resolution of critical violations and implement preventive measures'
      })
    }

    if (data.assessments.overdue > 0) {
      riskFactors.push({
        category: 'assessments',
        impact: data.assessments.overdue > 2 ? 'high' : 'medium',
        description: `${data.assessments.overdue} assessments are overdue`,
        recommendation: 'Complete overdue assessments and adjust planning for future assessments'
      })
    }

    if (data.training.completionRate < 80) {
      riskFactors.push({
        category: 'training',
        impact: data.training.completionRate < 50 ? 'high' : 'medium',
        description: `Training completion rate is ${Math.round(data.training.completionRate)}%`,
        recommendation: 'Implement training reminders and track completion more closely'
      })
    }

    // Determine trend (simplified - would need historical data for accurate trending)
    const trend = overallScore >= 80 ? 'stable' : overallScore >= 60 ? 'stable' : 'declining'

    return success({
      overallScore,
      categoryScores,
      riskFactors,
      trend: trend as any
    })
  }
}