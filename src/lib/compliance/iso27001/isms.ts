/**
 * Information Security Management System (ISMS) - ISO 27001 Core
 * Comprehensive ISMS implementation following ISO 27001:2022 standards
 */

import { supabaseAdmin } from '../../supabase-admin'
import { logSecurityEvent } from '../../security/audit'
import { enhancedAuditLogger } from '../../audit/enhanced-audit-logger'
import type { Database } from '../../../types/database'

export interface ISMSPolicy {
  id: string
  name: string
  version: string
  status: 'draft' | 'active' | 'deprecated' | 'retired'
  type: 'organizational' | 'technical' | 'physical' | 'administrative'
  category: string
  description: string
  content: string
  owner: string
  approver: string
  reviewFrequencyDays: number
  createdAt: Date
  approvedAt?: Date
  lastReviewedAt?: Date
  nextReviewDue: Date
  tags: string[]
  relatedControls: string[]
  metadata?: Record<string, unknown>
}

export interface SecurityControl {
  id: string
  controlId: string // e.g., "A.5.1"
  name: string
  category: 'organizational' | 'people' | 'physical' | 'technological'
  type: 'preventive' | 'detective' | 'corrective' | 'deterrent' | 'recovery' | 'compensating'
  domain: string // e.g., "Information security policies"
  objective: string
  description: string
  implementationGuidance: string
  status: 'not_implemented' | 'planned' | 'in_progress' | 'implemented' | 'not_applicable'
  effectivenessRating: 'ineffective' | 'partially_effective' | 'largely_effective' | 'effective'
  implementationDate?: Date
  lastTestDate?: Date
  nextTestDate?: Date
  owner: string
  evidence: string[]
  risks: string[]
  relatedControls: string[]
  complianceStatus: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_assessed'
  findings: SecurityControlFinding[]
  metadata?: Record<string, unknown>
}

export interface SecurityControlFinding {
  id: string
  controlId: string
  findingType: 'gap' | 'weakness' | 'deficiency' | 'observation' | 'best_practice'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  title: string
  description: string
  impact: string
  recommendation: string
  status: 'open' | 'in_progress' | 'closed' | 'risk_accepted'
  assignedTo?: string
  targetDate?: Date
  actualDate?: Date
  evidence?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface RiskAssessment {
  id: string
  organizationId?: string
  name: string
  description: string
  scope: string
  methodology: string
  status: 'planning' | 'in_progress' | 'review' | 'approved' | 'completed'
  assessmentDate: Date
  nextAssessmentDate: Date
  assessor: string
  approver?: string
  risks: IdentifiedRisk[]
  context: {
    internal: string[]
    external: string[]
    stakeholders: string[]
    criticalProcesses: string[]
  }
  riskCriteria: {
    likelihoodScale: RiskScale[]
    impactScale: RiskScale[]
    riskMatrix: RiskMatrix
  }
  summary: {
    totalRisks: number
    highRisks: number
    mediumRisks: number
    lowRisks: number
    riskScore: number
  }
  metadata?: Record<string, unknown>
}

export interface IdentifiedRisk {
  id: string
  assessmentId: string
  name: string
  description: string
  category: string
  source: string
  threat: string
  vulnerability: string
  asset: string
  assetValue: number
  likelihood: number
  impact: number
  inherentRisk: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  treatmentStrategy: 'avoid' | 'mitigate' | 'transfer' | 'accept'
  controls: string[]
  residualLikelihood: number
  residualImpact: number
  residualRisk: number
  residualRiskLevel: 'critical' | 'high' | 'medium' | 'low'
  treatmentPlan?: RiskTreatmentPlan
  owner: string
  reviewDate: Date
  status: 'identified' | 'analyzed' | 'treated' | 'monitored' | 'closed'
}

export interface RiskTreatmentPlan {
  id: string
  riskId: string
  treatment: string
  justification: string
  actions: RiskTreatmentAction[]
  cost: number
  timeline: string
  success_criteria: string
  owner: string
  approver: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  effectivenessReview?: Date
}

export interface RiskTreatmentAction {
  id: string
  description: string
  owner: string
  targetDate: Date
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  evidence?: string[]
}

export interface RiskScale {
  level: number
  label: string
  description: string
  criteria: string
}

export interface RiskMatrix {
  tolerance: 'low' | 'medium' | 'high'
  matrix: number[][]
}

export interface InformationAsset {
  id: string
  organizationId?: string
  name: string
  description: string
  type: 'data' | 'software' | 'physical' | 'service' | 'people' | 'intangible'
  category: string
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
  owner: string
  custodian?: string
  location: string
  format: 'electronic' | 'physical' | 'hybrid'
  confidentiality: number // 1-5 scale
  integrity: number
  availability: number
  assetValue: number
  dependencies: string[]
  threats: string[]
  vulnerabilities: string[]
  controls: string[]
  lastReviewDate?: Date
  nextReviewDate: Date
  retentionPeriod?: number
  disposalMethod?: string
  legalRequirements: string[]
  businessProcesses: string[]
  status: 'active' | 'inactive' | 'disposed'
  metadata?: Record<string, unknown>
}

export interface ISMSMetrics {
  period: {
    start: Date
    end: Date
  }
  controls: {
    total: number
    implemented: number
    effective: number
    compliance_percentage: number
  }
  risks: {
    total: number
    high_critical: number
    treated: number
    accepted: number
    risk_reduction_percentage: number
  }
  incidents: {
    total: number
    security_incidents: number
    resolved: number
    avg_resolution_time: number
  }
  training: {
    completion_rate: number
    effectiveness_score: number
  }
  audits: {
    findings: number
    closed_findings: number
    overdue_findings: number
  }
  maturity: {
    overall_score: number
    domain_scores: Record<string, number>
  }
}

/**
 * Information Security Management System Controller
 */
export class ISMSController {
  private readonly POLICY_REVIEW_REMINDER_DAYS = 30
  private readonly CONTROL_TEST_FREQUENCY_DAYS = 180
  private readonly RISK_REVIEW_FREQUENCY_DAYS = 90

  constructor() {
    this.initializePeriodicTasks()
  }

  /**
   * Initialize ISMS for an organization
   */
  async initializeISMS(
    organizationId: string,
    scope: string,
    context: {
      internal: string[]
      external: string[]
    },
    riskCriteria: {
      appetite: string
      tolerance: string
      methodology: string
    }
  ): Promise<void> {
    try {
      // Create initial ISMS configuration
      const ismsConfig = {
        organization_id: organizationId,
        scope,
        context: JSON.stringify(context),
        risk_criteria: JSON.stringify(riskCriteria),
        status: 'initializing',
        created_at: new Date().toISOString(),
        version: '1.0'
      }

      await supabaseAdmin
        .from('isms_configurations')
        .insert(ismsConfig)

      // Initialize default ISO 27001 controls
      await this.initializeISO27001Controls(organizationId)

      // Create initial risk assessment
      await this.createInitialRiskAssessment(organizationId, scope)

      // Log ISMS initialization
      await logSecurityEvent('isms_initialized', {
        organizationId,
        scope,
        context,
        riskCriteria
      }, 'medium')

      await enhancedAuditLogger.logEvent({
        organizationId,
        userId: 'system',
        eventType: 'security',
        eventCategory: 'isms',
        action: 'initialize',
        outcome: 'success',
        severity: 'medium',
        resourceType: 'isms',
        eventDescription: 'ISMS initialized for organization',
        businessContext: `ISMS scope: ${scope}`,
        complianceTags: ['ISO27001'],
        details: { scope, context, riskCriteria }
      })

    } catch (error) {
      await logSecurityEvent('isms_initialization_failed', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Get ISMS dashboard metrics
   */
  async getISMSMetrics(
    organizationId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ISMSMetrics> {
    const start = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = timeRange?.end || new Date()

    try {
      // Get control metrics
      let controlsQuery = supabaseAdmin
        .from('security_controls')
        .select('*')

      if (organizationId) {
        controlsQuery = controlsQuery.eq('organization_id', organizationId)
      }

      const { data: controls } = await controlsQuery

      const controlMetrics = {
        total: controls?.length || 0,
        implemented: controls?.filter(c => c.status === 'implemented').length || 0,
        effective: controls?.filter(c => c.effectiveness_rating === 'effective').length || 0,
        compliance_percentage: controls?.length ? 
          Math.round((controls.filter(c => c.compliance_status === 'compliant').length / controls.length) * 100) : 0
      }

      // Get risk metrics
      let risksQuery = supabaseAdmin
        .from('risk_assessments')
        .select(`
          *,
          identified_risks (*)
        `)
        .gte('assessment_date', start.toISOString())
        .lte('assessment_date', end.toISOString())

      if (organizationId) {
        risksQuery = risksQuery.eq('organization_id', organizationId)
      }

      const { data: riskAssessments } = await risksQuery

      const allRisks = riskAssessments?.flatMap(ra => ra.identified_risks || []) || []
      const riskMetrics = {
        total: allRisks.length,
        high_critical: allRisks.filter(r => ['high', 'critical'].includes(r.risk_level)).length,
        treated: allRisks.filter(r => r.status === 'treated').length,
        accepted: allRisks.filter(r => r.treatment_strategy === 'accept').length,
        risk_reduction_percentage: allRisks.length ? 
          Math.round((allRisks.filter(r => r.residual_risk < r.inherent_risk).length / allRisks.length) * 100) : 0
      }

      // Get incident metrics
      const { data: incidents } = await supabaseAdmin
        .from('security_incidents')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      const incidentMetrics = {
        total: incidents?.length || 0,
        security_incidents: incidents?.filter(i => i.incident_type === 'security').length || 0,
        resolved: incidents?.filter(i => i.status === 'resolved').length || 0,
        avg_resolution_time: this.calculateAverageResolutionTime(incidents || [])
      }

      // Calculate maturity score
      const maturityScore = this.calculateISMSMaturity(controlMetrics, riskMetrics, incidentMetrics)

      const metrics: ISMSMetrics = {
        period: { start, end },
        controls: controlMetrics,
        risks: riskMetrics,
        incidents: incidentMetrics,
        training: {
          completion_rate: 85, // Would be calculated from training records
          effectiveness_score: 78
        },
        audits: {
          findings: 12, // Would be calculated from audit records
          closed_findings: 8,
          overdue_findings: 2
        },
        maturity: maturityScore
      }

      return metrics

    } catch (error) {
      await logSecurityEvent('isms_metrics_failed', {
        organizationId,
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'medium')

      throw error
    }
  }

  /**
   * Create or update security control
   */
  async manageSecurityControl(control: Omit<SecurityControl, 'id'>): Promise<SecurityControl> {
    try {
      const controlData = {
        control_id: control.controlId,
        name: control.name,
        category: control.category,
        type: control.type,
        domain: control.domain,
        objective: control.objective,
        description: control.description,
        implementation_guidance: control.implementationGuidance,
        status: control.status,
        effectiveness_rating: control.effectivenessRating,
        implementation_date: control.implementationDate?.toISOString(),
        last_test_date: control.lastTestDate?.toISOString(),
        next_test_date: control.nextTestDate?.toISOString(),
        owner: control.owner,
        evidence: JSON.stringify(control.evidence),
        risks: JSON.stringify(control.risks),
        related_controls: JSON.stringify(control.relatedControls),
        compliance_status: control.complianceStatus,
        metadata: JSON.stringify(control.metadata),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabaseAdmin
        .from('security_controls')
        .insert(controlData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create security control: ${error.message}`)
      }

      const createdControl: SecurityControl = {
        id: data.id,
        ...control,
        findings: []
      }

      // Log control creation
      await enhancedAuditLogger.logEvent({
        userId: control.owner,
        eventType: 'security',
        eventCategory: 'isms',
        action: 'create_control',
        outcome: 'success',
        severity: 'medium',
        resourceType: 'security_control',
        resourceId: data.id,
        eventDescription: `Security control ${control.controlId} created`,
        businessContext: `Control: ${control.name}`,
        complianceTags: ['ISO27001'],
        details: { controlId: control.controlId, status: control.status }
      })

      return createdControl

    } catch (error) {
      await logSecurityEvent('security_control_creation_failed', {
        controlId: control.controlId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Conduct risk assessment
   */
  async conductRiskAssessment(
    organizationId: string,
    scope: string,
    methodology: string
  ): Promise<RiskAssessment> {
    try {
      const assessment: Omit<RiskAssessment, 'id' | 'risks'> = {
        organizationId,
        name: `Risk Assessment - ${new Date().toISOString().split('T')[0]}`,
        description: `Comprehensive risk assessment for ${scope}`,
        scope,
        methodology,
        status: 'planning',
        assessmentDate: new Date(),
        nextAssessmentDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        assessor: 'system', // Would be actual user ID
        context: {
          internal: ['Technology infrastructure', 'Business processes', 'Human resources'],
          external: ['Regulatory environment', 'Market conditions', 'Threat landscape'],
          stakeholders: ['Customers', 'Employees', 'Regulators', 'Partners'],
          criticalProcesses: ['Data processing', 'Access management', 'Incident response']
        },
        riskCriteria: {
          likelihoodScale: [
            { level: 1, label: 'Very Low', description: 'Highly unlikely', criteria: '<5% probability' },
            { level: 2, label: 'Low', description: 'Unlikely', criteria: '5-25% probability' },
            { level: 3, label: 'Medium', description: 'Possible', criteria: '25-75% probability' },
            { level: 4, label: 'High', description: 'Likely', criteria: '75-95% probability' },
            { level: 5, label: 'Very High', description: 'Almost certain', criteria: '>95% probability' }
          ],
          impactScale: [
            { level: 1, label: 'Minimal', description: 'Minor impact', criteria: 'Low financial/operational impact' },
            { level: 2, label: 'Minor', description: 'Small impact', criteria: 'Some financial/operational impact' },
            { level: 3, label: 'Moderate', description: 'Moderate impact', criteria: 'Significant impact' },
            { level: 4, label: 'Major', description: 'High impact', criteria: 'Major financial/operational impact' },
            { level: 5, label: 'Severe', description: 'Critical impact', criteria: 'Catastrophic impact' }
          ],
          riskMatrix: {
            tolerance: 'medium',
            matrix: [
              [1, 2, 3, 4, 5],
              [2, 4, 6, 8, 10],
              [3, 6, 9, 12, 15],
              [4, 8, 12, 16, 20],
              [5, 10, 15, 20, 25]
            ]
          }
        },
        summary: {
          totalRisks: 0,
          highRisks: 0,
          mediumRisks: 0,
          lowRisks: 0,
          riskScore: 0
        }
      }

      const assessmentData = {
        organization_id: organizationId,
        name: assessment.name,
        description: assessment.description,
        scope: assessment.scope,
        methodology: assessment.methodology,
        status: assessment.status,
        assessment_date: assessment.assessmentDate.toISOString(),
        next_assessment_date: assessment.nextAssessmentDate.toISOString(),
        assessor: assessment.assessor,
        context: JSON.stringify(assessment.context),
        risk_criteria: JSON.stringify(assessment.riskCriteria),
        summary: JSON.stringify(assessment.summary),
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabaseAdmin
        .from('risk_assessments')
        .insert(assessmentData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create risk assessment: ${error.message}`)
      }

      const createdAssessment: RiskAssessment = {
        id: data.id,
        ...assessment,
        risks: []
      }

      // Log risk assessment creation
      await enhancedAuditLogger.logEvent({
        organizationId,
        userId: assessment.assessor,
        eventType: 'security',
        eventCategory: 'risk_management',
        action: 'create_assessment',
        outcome: 'success',
        severity: 'medium',
        resourceType: 'risk_assessment',
        resourceId: data.id,
        eventDescription: `Risk assessment created for ${scope}`,
        businessContext: `Methodology: ${methodology}`,
        complianceTags: ['ISO27001'],
        details: { scope, methodology }
      })

      return createdAssessment

    } catch (error) {
      await logSecurityEvent('risk_assessment_creation_failed', {
        organizationId,
        scope,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Initialize default ISO 27001 controls
   */
  private async initializeISO27001Controls(organizationId: string): Promise<void> {
    const defaultControls = [
      {
        controlId: 'A.5.1',
        name: 'Policies for information security',
        category: 'organizational' as const,
        type: 'preventive' as const,
        domain: 'Information security policies',
        objective: 'To provide management direction and support for information security',
        description: 'A set of policies for information security shall be defined, approved by management, published and communicated to employees and relevant external parties.',
        implementationGuidance: 'Develop comprehensive information security policies covering all aspects of information security management.',
        status: 'not_implemented' as const,
        effectivenessRating: 'ineffective' as const,
        owner: 'CISO',
        evidence: [],
        risks: [],
        relatedControls: ['A.5.2', 'A.5.3'],
        complianceStatus: 'not_assessed' as const,
        findings: []
      },
      // Add more controls as needed...
    ]

    for (const control of defaultControls) {
      await this.manageSecurityControl(control)
    }
  }

  /**
   * Create initial risk assessment
   */
  private async createInitialRiskAssessment(organizationId: string, scope: string): Promise<void> {
    await this.conductRiskAssessment(
      organizationId,
      scope,
      'ISO 27005:2018 - Information security risk management'
    )
  }

  /**
   * Calculate average resolution time for incidents
   */
  private calculateAverageResolutionTime(incidents: any[]): number {
    const resolvedIncidents = incidents.filter(i => i.resolved_at && i.created_at)
    
    if (resolvedIncidents.length === 0) return 0

    const totalTime = resolvedIncidents.reduce((acc, incident) => {
      const start = new Date(incident.created_at).getTime()
      const end = new Date(incident.resolved_at).getTime()
      return acc + (end - start)
    }, 0)

    return Math.round(totalTime / resolvedIncidents.length / (1000 * 60 * 60)) // Hours
  }

  /**
   * Calculate ISMS maturity score
   */
  private calculateISMSMaturity(
    controls: any,
    risks: any,
    incidents: any
  ): { overall_score: number; domain_scores: Record<string, number> } {
    // Simplified maturity calculation
    const controlMaturity = Math.min(100, (controls.compliance_percentage + controls.implemented / Math.max(1, controls.total) * 100) / 2)
    const riskMaturity = Math.min(100, 100 - (risks.high_critical / Math.max(1, risks.total) * 100))
    const incidentMaturity = incidents.total === 0 ? 100 : Math.min(100, (incidents.resolved / Math.max(1, incidents.total)) * 100)

    const overallScore = Math.round((controlMaturity + riskMaturity + incidentMaturity) / 3)

    return {
      overall_score: overallScore,
      domain_scores: {
        'security_controls': Math.round(controlMaturity),
        'risk_management': Math.round(riskMaturity),
        'incident_management': Math.round(incidentMaturity),
        'policy_management': 75, // Would be calculated from policy compliance
        'training_awareness': 80  // Would be calculated from training metrics
      }
    }
  }

  /**
   * Initialize periodic ISMS tasks
   */
  private initializePeriodicTasks(): void {
    // Policy review reminders
    setInterval(async () => {
      await this.checkPolicyReviewDates()
    }, 24 * 60 * 60 * 1000) // Daily

    // Control testing reminders
    setInterval(async () => {
      await this.checkControlTestingDates()
    }, 7 * 24 * 60 * 60 * 1000) // Weekly

    // Risk review reminders
    setInterval(async () => {
      await this.checkRiskReviewDates()
    }, 7 * 24 * 60 * 60 * 1000) // Weekly
  }

  /**
   * Check policy review dates and send reminders
   */
  private async checkPolicyReviewDates(): Promise<void> {
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + this.POLICY_REVIEW_REMINDER_DAYS)

    const { data: policies } = await supabaseAdmin
      .from('isms_policies')
      .select('*')
      .lte('next_review_due', reminderDate.toISOString())
      .eq('status', 'active')

    for (const policy of policies || []) {
      await logSecurityEvent('policy_review_due', {
        policyId: policy.id,
        policyName: policy.name,
        owner: policy.owner,
        dueDate: policy.next_review_due
      }, 'medium')
    }
  }

  /**
   * Check control testing dates and send reminders
   */
  private async checkControlTestingDates(): Promise<void> {
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + 30) // 30 days reminder

    const { data: controls } = await supabaseAdmin
      .from('security_controls')
      .select('*')
      .lte('next_test_date', reminderDate.toISOString())
      .eq('status', 'implemented')

    for (const control of controls || []) {
      await logSecurityEvent('control_test_due', {
        controlId: control.control_id,
        controlName: control.name,
        owner: control.owner,
        dueDate: control.next_test_date
      }, 'medium')
    }
  }

  /**
   * Check risk review dates and send reminders
   */
  private async checkRiskReviewDates(): Promise<void> {
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + 30) // 30 days reminder

    const { data: assessments } = await supabaseAdmin
      .from('risk_assessments')
      .select('*')
      .lte('next_assessment_date', reminderDate.toISOString())
      .neq('status', 'completed')

    for (const assessment of assessments || []) {
      await logSecurityEvent('risk_assessment_due', {
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        assessor: assessment.assessor,
        dueDate: assessment.next_assessment_date
      }, 'medium')
    }
  }
}

// Export singleton instance
export const ismsController = new ISMSController()

// Convenience functions
export async function initializeOrganizationISMS(
  organizationId: string,
  scope: string,
  context: { internal: string[]; external: string[] },
  riskCriteria: { appetite: string; tolerance: string; methodology: string }
): Promise<void> {
  return ismsController.initializeISMS(organizationId, scope, context, riskCriteria)
}

export async function getISMSDashboard(
  organizationId?: string,
  timeRange?: { start: Date; end: Date }
): Promise<ISMSMetrics> {
  return ismsController.getISMSMetrics(organizationId, timeRange)
}

export async function createSecurityControl(
  control: Omit<SecurityControl, 'id'>
): Promise<SecurityControl> {
  return ismsController.manageSecurityControl(control)
}

export async function performRiskAssessment(
  organizationId: string,
  scope: string,
  methodology: string = 'ISO 27005:2018'
): Promise<RiskAssessment> {
  return ismsController.conductRiskAssessment(organizationId, scope, methodology)
}