/**
 * Enhanced Compliance Repository
 * Comprehensive data layer for compliance tracking and management
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceFinding,
  RemediationPlan,
  CompliancePolicy,
  ComplianceMetrics,
  ComplianceAlert,
  ComplianceReport,
  ComplianceSearchFilters,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  CreateRemediationRequest,
  ComplianceStatus,
  CompliancePriority
} from '@/types/compliance'

export class ComplianceRepository {
  private supabase: ReturnType<typeof createClient<Database>>

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // ============================================================================
  // COMPLIANCE FRAMEWORKS
  // ============================================================================

  async getFrameworks(organizationId: string): Promise<ComplianceFramework[]> {
    const { data, error } = await this.supabase
      .from('compliance_frameworks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch frameworks: ${error.message}`)
    return data as ComplianceFramework[]
  }

  async getFramework(id: string, organizationId: string): Promise<ComplianceFramework | null> {
    const { data, error } = await this.supabase
      .from('compliance_frameworks')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch framework: ${error.message}`)
    }
    return data as ComplianceFramework | null
  }

  async createFramework(framework: Omit<ComplianceFramework, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceFramework> {
    const { data, error } = await this.supabase
      .from('compliance_frameworks')
      .insert([{
        ...framework,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create framework: ${error.message}`)
    return data as ComplianceFramework
  }

  // ============================================================================
  // COMPLIANCE ASSESSMENTS
  // ============================================================================

  async getAssessments(organizationId: string, filters?: ComplianceSearchFilters): Promise<ComplianceAssessment[]> {
    let query = this.supabase
      .from('compliance_assessments')
      .select(`
        *,
        compliance_frameworks (name, type),
        compliance_findings (*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters?.frameworks?.length) {
      query = query.in('framework_id', filters.frameworks)
    }
    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch assessments: ${error.message}`)
    return data as ComplianceAssessment[]
  }

  async getAssessment(id: string, organizationId: string): Promise<ComplianceAssessment | null> {
    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .select(`
        *,
        compliance_frameworks (name, type, requirements),
        compliance_findings (
          *,
          remediation_plans (*)
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch assessment: ${error.message}`)
    }
    return data as ComplianceAssessment | null
  }

  async createAssessment(assessment: CreateAssessmentRequest, organizationId: string, createdBy: string): Promise<ComplianceAssessment> {
    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .insert([{
        ...assessment,
        organization_id: organizationId,
        status: 'draft',
        overall_rating: 'not-assessed',
        findings: [],
        recommendations: [],
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create assessment: ${error.message}`)
    return data as ComplianceAssessment
  }

  async updateAssessment(id: string, updates: UpdateAssessmentRequest, organizationId: string): Promise<ComplianceAssessment> {
    const { data, error } = await this.supabase
      .from('compliance_assessments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update assessment: ${error.message}`)
    return data as ComplianceAssessment
  }

  // ============================================================================
  // COMPLIANCE FINDINGS
  // ============================================================================

  async getFindings(organizationId: string, filters?: ComplianceSearchFilters): Promise<ComplianceFinding[]> {
    let query = this.supabase
      .from('compliance_findings')
      .select(`
        *,
        compliance_assessments!inner (organization_id),
        remediation_plans (*)
      `)
      .eq('compliance_assessments.organization_id', organizationId)

    if (filters?.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters?.priority?.length) {
      query = query.in('severity', filters.priority)
    }
    if (filters?.assignedTo?.length) {
      query = query.in('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch findings: ${error.message}`)
    return data as ComplianceFinding[]
  }

  async createFinding(finding: Omit<ComplianceFinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceFinding> {
    const { data, error } = await this.supabase
      .from('compliance_findings')
      .insert([{
        ...finding,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create finding: ${error.message}`)
    return data as ComplianceFinding
  }

  // ============================================================================
  // REMEDIATION PLANS
  // ============================================================================

  async getRemediationPlans(organizationId: string): Promise<RemediationPlan[]> {
    const { data, error } = await this.supabase
      .from('remediation_plans')
      .select(`
        *,
        compliance_findings!inner (
          compliance_assessments!inner (organization_id)
        )
      `)
      .eq('compliance_findings.compliance_assessments.organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch remediation plans: ${error.message}`)
    return data as RemediationPlan[]
  }

  async createRemediationPlan(plan: CreateRemediationRequest): Promise<RemediationPlan> {
    const { data, error } = await this.supabase
      .from('remediation_plans')
      .insert([{
        ...plan,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create remediation plan: ${error.message}`)
    return data as RemediationPlan
  }

  async updateRemediationProgress(id: string, progress: number, status: string): Promise<RemediationPlan> {
    const { data, error } = await this.supabase
      .from('remediation_plans')
      .update({
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update remediation progress: ${error.message}`)
    return data as RemediationPlan
  }

  // ============================================================================
  // COMPLIANCE POLICIES
  // ============================================================================

  async getPolicies(organizationId: string): Promise<CompliancePolicy[]> {
    const { data, error } = await this.supabase
      .from('compliance_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch policies: ${error.message}`)
    return data as CompliancePolicy[]
  }

  async createPolicy(policy: Omit<CompliancePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompliancePolicy> {
    const { data, error } = await this.supabase
      .from('compliance_policies')
      .insert([{
        ...policy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create policy: ${error.message}`)
    return data as CompliancePolicy
  }

  // ============================================================================
  // COMPLIANCE METRICS
  // ============================================================================

  async getComplianceMetrics(organizationId: string): Promise<ComplianceMetrics> {
    // Get overall compliance statistics
    const { data: assessments, error: assessmentsError } = await this.supabase
      .from('compliance_assessments')
      .select(`
        *,
        compliance_frameworks (name, type),
        compliance_findings (status, severity)
      `)
      .eq('organization_id', organizationId)

    if (assessmentsError) throw new Error(`Failed to fetch compliance metrics: ${assessmentsError.message}`)

    // Calculate compliance scores
    const frameworkScores: Record<string, number> = {}
    let totalRequirements = 0
    let compliantRequirements = 0

    assessments?.forEach(assessment => {
      const framework = (assessment as any).compliance_frameworks
      const findings = (assessment as any).compliance_findings || []
      
      if (framework) {
        const compliant = findings.filter((f: any) => f.status === 'compliant').length
        const total = findings.length || 1
        frameworkScores[framework.name] = Math.round((compliant / total) * 100)
        
        totalRequirements += total
        compliantRequirements += compliant
      }
    })

    const overallComplianceScore = totalRequirements > 0 
      ? Math.round((compliantRequirements / totalRequirements) * 100) 
      : 0

    // Get upcoming deadlines
    const { data: remediationPlans } = await this.supabase
      .from('remediation_plans')
      .select(`
        *,
        compliance_findings!inner (
          title,
          compliance_assessments!inner (organization_id)
        )
      `)
      .eq('compliance_findings.compliance_assessments.organization_id', organizationId)
      .gte('target_date', new Date().toISOString())
      .order('target_date', { ascending: true })
      .limit(10)

    const upcomingDeadlines = (remediationPlans || []).map(plan => ({
      type: 'remediation' as const,
      item: (plan as any).compliance_findings?.title || 'Remediation Plan',
      dueDate: (plan as any).target_date,
      daysRemaining: Math.ceil((new Date((plan as any).target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      priority: (plan as any).priority as CompliancePriority
    }))

    return {
      overallComplianceScore,
      frameworkScores,
      trendsOverTime: [], // This would require historical data tracking
      riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 }, // Calculate from findings
      upcomingDeadlines,
      topRisks: []
    }
  }

  // ============================================================================
  // COMPLIANCE ALERTS
  // ============================================================================

  async getAlerts(organizationId: string, unreadOnly: boolean = false): Promise<ComplianceAlert[]> {
    let query = this.supabase
      .from('compliance_alerts')
      .select('*')
      .eq('organization_id', organizationId)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch alerts: ${error.message}`)
    return data as ComplianceAlert[]
  }

  async createAlert(alert: Omit<ComplianceAlert, 'id' | 'createdAt'>): Promise<ComplianceAlert> {
    const { data, error } = await this.supabase
      .from('compliance_alerts')
      .insert([{
        ...alert,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw new Error(`Failed to create alert: ${error.message}`)
    return data as ComplianceAlert
  }

  async markAlertAsRead(id: string, organizationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('compliance_alerts')
      .update({ is_read: true })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) throw new Error(`Failed to mark alert as read: ${error.message}`)
  }

  // ============================================================================
  // SEARCH & ANALYTICS
  // ============================================================================

  async searchCompliance(organizationId: string, query: string, filters?: ComplianceSearchFilters) {
    const { data, error } = await this.supabase
      .rpc('search_compliance_data', {
        org_id: organizationId,
        search_query: query,
        filter_params: filters || {}
      })

    if (error) throw new Error(`Failed to search compliance data: ${error.message}`)
    return data
  }

  async generateComplianceReport(organizationId: string, reportConfig: any): Promise<ComplianceReport> {
    // This would typically integrate with a report generation service
    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      name: reportConfig.name,
      type: reportConfig.type,
      scope: reportConfig.scope,
      format: reportConfig.format,
      generatedBy: reportConfig.generatedBy,
      generatedAt: new Date().toISOString(),
      status: 'generating',
      organizationId
    }

    const { data, error } = await this.supabase
      .from('compliance_reports')
      .insert([report])
      .select()
      .single()

    if (error) throw new Error(`Failed to create compliance report: ${error.message}`)
    return data as ComplianceReport
  }
}