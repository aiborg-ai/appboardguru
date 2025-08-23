import { BaseService } from './base.service'
import { AdvancedComplianceRepository } from '../repositories/advanced-compliance.repository'
import { EnhancedAuditRepository } from '../repositories/enhanced-audit.repository'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import { 
  UserId, 
  OrganizationId, 
  ComplianceFrameworkId,
  CompliancePolicyId,
  ComplianceAssessmentId,
  ComplianceViolationId,
  ComplianceTrainingId,
  createUserId,
  createOrganizationId,
  createComplianceFrameworkId,
  createCompliancePolicyId,
  createComplianceAssessmentId,
  createComplianceViolationId
} from '../../types/branded'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'

// ==========================================
// SERVICE INTERFACES AND TYPES
// ==========================================

export interface ComplianceFrameworkSummary {
  id: ComplianceFrameworkId
  name: string
  acronym: string
  version: string
  jurisdiction?: string
  industry?: string
  requirementCount: number
  organizationPolicyCount: number
  assessmentCount: number
  violationCount: number
  complianceScore?: number
  lastAssessmentDate?: string
  nextAssessmentDue?: string
}

export interface ComplianceGapAnalysis {
  frameworkId: ComplianceFrameworkId
  frameworkName: string
  totalRequirements: number
  implementedRequirements: number
  missingRequirements: number
  implementationGaps: Array<{
    requirementId: string
    requirementCode: string
    title: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    category: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    recommendedActions: string[]
    estimatedEffort: 'low' | 'medium' | 'high'
    dependencies: string[]
  }>
  compliancePercentage: number
  riskScore: number
  recommendedNextSteps: string[]
}

export interface ComplianceRoadmap {
  organizationId: OrganizationId
  frameworkId: ComplianceFrameworkId
  phases: Array<{
    phase: number
    title: string
    description: string
    startDate: Date
    endDate: Date
    milestones: Array<{
      title: string
      description: string
      dueDate: Date
      dependencies: string[]
      assignedTo?: UserId
      estimatedHours: number
      priority: 'low' | 'medium' | 'high' | 'critical'
    }>
    deliverables: string[]
    resourceRequirements: Array<{
      type: 'internal' | 'external' | 'tool' | 'training'
      description: string
      quantity: number
      estimatedCost?: number
    }>
  }>
  totalDuration: number
  totalCost?: number
  keyRisks: Array<{
    risk: string
    impact: 'low' | 'medium' | 'high' | 'critical'
    probability: 'low' | 'medium' | 'high'
    mitigation: string
  }>
}

export interface ComplianceAutomationRule {
  id: string
  name: string
  frameworkId: ComplianceFrameworkId
  requirementId: string
  trigger: {
    type: 'schedule' | 'event' | 'threshold' | 'manual'
    configuration: Record<string, any>
  }
  actions: Array<{
    type: 'assessment' | 'notification' | 'report' | 'remediation'
    configuration: Record<string, any>
  }>
  conditions: Array<{
    field: string
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex'
    value: any
  }>
  isActive: boolean
  lastExecuted?: Date
  nextExecution?: Date
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const CreateComplianceAssessmentRequestSchema = z.object({
  organizationId: z.string().transform(v => createOrganizationId(v)),
  frameworkId: z.string().transform(v => createComplianceFrameworkId(v)),
  title: z.string().min(1).max(500),
  assessmentType: z.enum(['self', 'internal_audit', 'external_audit', 'regulatory_exam', 'continuous']),
  scope: z.string().max(2000).optional(),
  plannedStartDate: z.date(),
  plannedEndDate: z.date(),
  leadAssessorId: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  assessmentTeam: z.array(z.string()).default([]).transform(ids =>
    ids.map(id => createUserId(id)).filter(result => result.success).map(result => result.data!)
  ),
  requirementsToTest: z.array(z.string()).default([]),
  methodology: z.string().max(5000).optional(),
  budget: z.number().nonnegative().optional()
})

const CreateViolationRequestSchema = z.object({
  organizationId: z.string().transform(v => createOrganizationId(v)),
  frameworkId: z.string().optional().transform(v => v ? createComplianceFrameworkId(v) : undefined),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1).max(100),
  detectedDate: z.date(),
  affectedSystems: z.array(z.string()).default([]),
  impactAssessment: z.string().max(2000).optional(),
  remediationPlan: z.string().min(1),
  responsibleParty: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  targetResolutionDate: z.date().optional()
})

// ==========================================
// ADVANCED COMPLIANCE ENGINE SERVICE
// ==========================================

export class AdvancedComplianceEngineService extends BaseService {
  private complianceRepository: AdvancedComplianceRepository
  private auditRepository: EnhancedAuditRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.complianceRepository = new AdvancedComplianceRepository(supabase)
    this.auditRepository = new EnhancedAuditRepository(supabase)
  }

  // ==========================================
  // COMPLIANCE FRAMEWORK MANAGEMENT
  // ==========================================

  async getAvailableFrameworks(
    filters: {
      jurisdiction?: string
      industry?: string
      search?: string
    } = {}
  ): Promise<Result<ComplianceFrameworkSummary[]>> {
    try {
      const frameworksResult = await this.complianceRepository.findAllFrameworks({
        search: filters.search,
        filters: {
          jurisdiction: filters.jurisdiction,
          industry: filters.industry
        }
      })

      if (!frameworksResult.success) {
        return frameworksResult as any
      }

      const frameworks = frameworksResult.data.data
      const summaries: ComplianceFrameworkSummary[] = []

      for (const framework of frameworks) {
        // Get requirement count
        const requirementsResult = await this.complianceRepository.findFrameworkRequirements(
          framework.id as ComplianceFrameworkId
        )
        const requirementCount = requirementsResult.success ? requirementsResult.data.total : 0

        // Create summary
        summaries.push({
          id: framework.id as ComplianceFrameworkId,
          name: framework.name,
          acronym: framework.acronym,
          version: framework.version,
          jurisdiction: framework.jurisdiction,
          industry: framework.industry,
          requirementCount,
          organizationPolicyCount: 0, // Would need to aggregate across organizations
          assessmentCount: 0,
          violationCount: 0
        })
      }

      return success(summaries)
    } catch (error) {
      return this.handleError(error, 'getAvailableFrameworks')
    }
  }

  async getFrameworkDetails(
    frameworkId: ComplianceFrameworkId,
    organizationId?: OrganizationId
  ): Promise<Result<{
    framework: any
    requirements: any[]
    organizationStatus?: {
      policiesCount: number
      assessmentsCount: number
      violationsCount: number
      complianceScore?: number
      lastAssessment?: string
    }
  }>> {
    try {
      // Get framework basic info
      const frameworkResult = await this.complianceRepository.findFrameworkById(frameworkId)
      if (!frameworkResult.success) {
        return frameworkResult as any
      }

      // Get requirements
      const requirementsResult = await this.complianceRepository.findFrameworkRequirements(frameworkId)
      if (!requirementsResult.success) {
        return requirementsResult as any
      }

      const result: any = {
        framework: frameworkResult.data,
        requirements: requirementsResult.data.data
      }

      // If organization is provided, get organization-specific status
      if (organizationId) {
        const [policiesResult, assessmentsResult, violationsResult] = await Promise.all([
          this.complianceRepository.findPoliciesByOrganization(organizationId, frameworkId),
          this.complianceRepository.findAssessmentsByOrganization(organizationId, frameworkId),
          this.complianceRepository.findViolationsByOrganization(organizationId, { frameworkId })
        ])

        result.organizationStatus = {
          policiesCount: policiesResult.success ? policiesResult.data.total : 0,
          assessmentsCount: assessmentsResult.success ? assessmentsResult.data.total : 0,
          violationsCount: violationsResult.success ? violationsResult.data.total : 0
        }

        // Calculate compliance score based on assessments
        if (assessmentsResult.success) {
          const completedAssessments = assessmentsResult.data.data.filter(a => a.status === 'completed')
          if (completedAssessments.length > 0) {
            const latestAssessment = completedAssessments[0] // Assuming sorted by date
            result.organizationStatus.complianceScore = latestAssessment.overall_score
            result.organizationStatus.lastAssessment = latestAssessment.actual_end_date || latestAssessment.created_at
          }
        }
      }

      return success(result)
    } catch (error) {
      return this.handleError(error, 'getFrameworkDetails')
    }
  }

  // ==========================================
  // COMPLIANCE GAP ANALYSIS
  // ==========================================

  async performGapAnalysis(
    organizationId: OrganizationId,
    frameworkId: ComplianceFrameworkId
  ): Promise<Result<ComplianceGapAnalysis>> {
    try {
      // Get all framework requirements
      const requirementsResult = await this.complianceRepository.findFrameworkRequirements(frameworkId)
      if (!requirementsResult.success) {
        return requirementsResult as any
      }

      const requirements = requirementsResult.data.data

      // Get organization policies for this framework
      const policiesResult = await this.complianceRepository.findPoliciesByOrganization(organizationId, frameworkId)
      if (!policiesResult.success) {
        return policiesResult as any
      }

      const policies = policiesResult.data.data

      // Get recent assessments to understand implementation status
      const assessmentsResult = await this.complianceRepository.findAssessmentsByOrganization(organizationId, frameworkId)
      const assessments = assessmentsResult.success ? assessmentsResult.data.data : []

      // Analyze gaps
      const implementationGaps: any[] = []
      let implementedCount = 0

      for (const requirement of requirements) {
        // Check if requirement is covered by policies
        const hasPolicycoverage = policies.some(policy => 
          policy.status === 'active' && 
          (policy.content.toLowerCase().includes(requirement.title.toLowerCase()) ||
           policy.content.toLowerCase().includes(requirement.requirement_code.toLowerCase()))
        )

        // Check assessment results for this requirement
        let assessmentStatus = 'not_assessed'
        const latestAssessment = assessments
          .filter(a => a.status === 'completed')
          .find(a => a.requirements_tested.includes(requirement.id))

        if (latestAssessment) {
          // In a real implementation, you'd check findings for this specific requirement
          assessmentStatus = 'compliant' // Simplified assumption
        }

        if (!hasPolicyCoverage || assessmentStatus !== 'compliant') {
          // Calculate risk level based on requirement priority and current gaps
          let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
          if (requirement.priority === 'critical' && !hasPolicyCategory) {
            riskLevel = 'critical'
          } else if (requirement.priority === 'high') {
            riskLevel = 'high'
          }

          const recommendedActions: string[] = []
          if (!hasPolicyCategory) {
            recommendedActions.push('Develop and implement policy addressing this requirement')
          }
          if (assessmentStatus === 'not_assessed') {
            recommendedActions.push('Include in next compliance assessment')
          }
          if (assessmentStatus === 'non_compliant') {
            recommendedActions.push('Remediate identified compliance gaps')
          }

          implementationGaps.push({
            requirementId: requirement.id,
            requirementCode: requirement.requirement_code,
            title: requirement.title,
            priority: requirement.priority,
            category: requirement.category,
            riskLevel,
            recommendedActions,
            estimatedEffort: requirement.priority === 'critical' ? 'high' : 'medium',
            dependencies: requirement.related_requirements || []
          })
        } else {
          implementedCount++
        }
      }

      const totalRequirements = requirements.length
      const compliancePercentage = totalRequirements > 0 
        ? (implementedCount / totalRequirements) * 100 
        : 0

      // Calculate risk score based on gaps and their severity
      const riskScore = implementationGaps.reduce((score, gap) => {
        const riskWeight = {
          low: 1,
          medium: 2,
          high: 4,
          critical: 8
        }[gap.riskLevel]
        return score + riskWeight
      }, 0)

      // Generate recommended next steps
      const recommendedNextSteps: string[] = []
      const criticalGaps = implementationGaps.filter(g => g.riskLevel === 'critical')
      const highGaps = implementationGaps.filter(g => g.riskLevel === 'high')

      if (criticalGaps.length > 0) {
        recommendedNextSteps.push(`Address ${criticalGaps.length} critical compliance gaps immediately`)
      }
      if (highGaps.length > 0) {
        recommendedNextSteps.push(`Plan remediation for ${highGaps.length} high-priority gaps`)
      }
      if (compliancePercentage < 50) {
        recommendedNextSteps.push('Consider engaging external compliance consultant')
      }
      if (!assessments.length) {
        recommendedNextSteps.push('Schedule comprehensive compliance assessment')
      }

      // Get framework details for the response
      const frameworkResult = await this.complianceRepository.findFrameworkById(frameworkId)
      const frameworkName = frameworkResult.success ? frameworkResult.data!.name : 'Unknown Framework'

      return success({
        frameworkId,
        frameworkName,
        totalRequirements,
        implementedRequirements: implementedCount,
        missingRequirements: implementationGaps.length,
        implementationGaps,
        compliancePercentage: Math.round(compliancePercentage * 100) / 100,
        riskScore,
        recommendedNextSteps
      })

    } catch (error) {
      return this.handleError(error, 'performGapAnalysis')
    }
  }

  // ==========================================
  // COMPLIANCE ROADMAP GENERATION
  // ==========================================

  async generateComplianceRoadmap(
    organizationId: OrganizationId,
    frameworkId: ComplianceFrameworkId,
    targetCompletionDate: Date,
    availableResources?: {
      internalTeamSize: number
      budget?: number
      externalConsultingDays?: number
    }
  ): Promise<Result<ComplianceRoadmap>> {
    try {
      // First perform gap analysis to understand what needs to be done
      const gapAnalysisResult = await this.performGapAnalysis(organizationId, frameworkId)
      if (!gapAnalysisResult.success) {
        return gapAnalysisResult as any
      }

      const gapAnalysis = gapAnalysisResult.data
      const startDate = new Date()
      const totalDays = Math.ceil((targetCompletionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Group gaps by category and priority for phasing
      const gapsByCategory = gapAnalysis.implementationGaps.reduce((acc, gap) => {
        if (!acc[gap.category]) {
          acc[gap.category] = []
        }
        acc[gap.category].push(gap)
        return acc
      }, {} as Record<string, any[]>)

      // Create phases based on priority and dependencies
      const phases: ComplianceRoadmap['phases'] = []
      
      // Phase 1: Critical and foundational requirements (first 25% of timeline)
      const phase1Duration = Math.ceil(totalDays * 0.25)
      const phase1EndDate = new Date(startDate.getTime() + phase1Duration * 24 * 60 * 60 * 1000)
      
      const criticalGaps = gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'critical')
      if (criticalGaps.length > 0) {
        phases.push({
          phase: 1,
          title: 'Critical Compliance Gaps',
          description: 'Address critical compliance requirements and establish foundational controls',
          startDate,
          endDate: phase1EndDate,
          milestones: criticalGaps.map((gap, index) => ({
            title: `Implement ${gap.title}`,
            description: gap.recommendedActions.join('; '),
            dueDate: new Date(startDate.getTime() + ((index + 1) * phase1Duration / criticalGaps.length) * 24 * 60 * 60 * 1000),
            dependencies: gap.dependencies,
            estimatedHours: gap.estimatedEffort === 'high' ? 40 : gap.estimatedEffort === 'medium' ? 20 : 10,
            priority: gap.priority as any
          })),
          deliverables: [
            'Critical policies implemented',
            'High-risk gaps addressed',
            'Initial compliance framework established'
          ],
          resourceRequirements: [
            {
              type: 'internal',
              description: 'Compliance team members',
              quantity: availableResources?.internalTeamSize || 2,
              estimatedCost: 0
            },
            {
              type: 'external',
              description: 'External compliance consultant',
              quantity: 10,
              estimatedCost: 15000
            }
          ]
        })
      }

      // Phase 2: High priority requirements (next 35% of timeline)
      const phase2Duration = Math.ceil(totalDays * 0.35)
      const phase2StartDate = phases.length > 0 ? phase1EndDate : startDate
      const phase2EndDate = new Date(phase2StartDate.getTime() + phase2Duration * 24 * 60 * 60 * 1000)
      
      const highGaps = gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'high')
      if (highGaps.length > 0) {
        phases.push({
          phase: phases.length + 1,
          title: 'High Priority Implementation',
          description: 'Implement high-priority compliance requirements and controls',
          startDate: phase2StartDate,
          endDate: phase2EndDate,
          milestones: highGaps.map((gap, index) => ({
            title: `Implement ${gap.title}`,
            description: gap.recommendedActions.join('; '),
            dueDate: new Date(phase2StartDate.getTime() + ((index + 1) * phase2Duration / highGaps.length) * 24 * 60 * 60 * 1000),
            dependencies: gap.dependencies,
            estimatedHours: gap.estimatedEffort === 'high' ? 30 : gap.estimatedEffort === 'medium' ? 15 : 8,
            priority: gap.priority as any
          })),
          deliverables: [
            'High-priority policies and controls implemented',
            'Training programs established',
            'Monitoring procedures in place'
          ],
          resourceRequirements: [
            {
              type: 'internal',
              description: 'Implementation team',
              quantity: availableResources?.internalTeamSize || 3,
            },
            {
              type: 'training',
              description: 'Staff training programs',
              quantity: 1,
              estimatedCost: 5000
            }
          ]
        })
      }

      // Phase 3: Medium priority and validation (remaining timeline)
      const phase3StartDate = phases.length > 0 ? phase2EndDate : startDate
      const mediumGaps = gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'medium')
      
      if (mediumGaps.length > 0) {
        phases.push({
          phase: phases.length + 1,
          title: 'Implementation Completion and Validation',
          description: 'Complete remaining requirements and validate compliance',
          startDate: phase3StartDate,
          endDate: targetCompletionDate,
          milestones: [
            ...mediumGaps.map((gap, index) => ({
              title: `Implement ${gap.title}`,
              description: gap.recommendedActions.join('; '),
              dueDate: new Date(phase3StartDate.getTime() + ((index + 1) * (targetCompletionDate.getTime() - phase3StartDate.getTime()) / (mediumGaps.length + 2))),
              dependencies: gap.dependencies,
              estimatedHours: gap.estimatedEffort === 'high' ? 20 : gap.estimatedEffort === 'medium' ? 10 : 5,
              priority: gap.priority as any
            })),
            {
              title: 'Comprehensive Compliance Assessment',
              description: 'Conduct full compliance assessment to validate implementation',
              dueDate: new Date(targetCompletionDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks before end
              dependencies: [],
              estimatedHours: 80,
              priority: 'high' as const
            },
            {
              title: 'Final Compliance Certification',
              description: 'Complete certification process and documentation',
              dueDate: targetCompletionDate,
              dependencies: [],
              estimatedHours: 40,
              priority: 'critical' as const
            }
          ],
          deliverables: [
            'All compliance requirements implemented',
            'Compliance assessment completed',
            'Certification achieved',
            'Ongoing monitoring established'
          ],
          resourceRequirements: [
            {
              type: 'internal',
              description: 'Project team',
              quantity: availableResources?.internalTeamSize || 2,
            },
            {
              type: 'external',
              description: 'External auditor for assessment',
              quantity: 5,
              estimatedCost: 10000
            }
          ]
        })
      }

      // Calculate total cost and identify risks
      const totalCost = phases.reduce((sum, phase) => 
        sum + phase.resourceRequirements.reduce((phaseSum, req) => 
          phaseSum + (req.estimatedCost || 0), 0
        ), 0
      )

      const keyRisks: ComplianceRoadmap['keyRisks'] = [
        {
          risk: 'Insufficient internal resources',
          impact: 'high',
          probability: availableResources?.internalTeamSize && availableResources.internalTeamSize < 3 ? 'high' : 'medium',
          mitigation: 'Engage additional external consultants or extend timeline'
        },
        {
          risk: 'Regulatory changes during implementation',
          impact: 'medium',
          probability: 'low',
          mitigation: 'Monitor regulatory updates and build flexibility into implementation'
        },
        {
          risk: 'Budget constraints',
          impact: 'high',
          probability: availableResources?.budget && availableResources.budget < totalCost ? 'high' : 'low',
          mitigation: 'Prioritize critical requirements and phase implementation'
        },
        {
          risk: 'Staff resistance to new processes',
          impact: 'medium',
          probability: 'medium',
          mitigation: 'Comprehensive change management and training program'
        }
      ]

      return success({
        organizationId,
        frameworkId,
        phases,
        totalDuration: totalDays,
        totalCost,
        keyRisks
      })

    } catch (error) {
      return this.handleError(error, 'generateComplianceRoadmap')
    }
  }

  // ==========================================
  // ASSESSMENT MANAGEMENT
  // ==========================================

  async createAssessment(
    assessmentRequest: z.infer<typeof CreateComplianceAssessmentRequestSchema>,
    createdBy: UserId
  ): Promise<Result<any>> {
    try {
      const validation = CreateComplianceAssessmentRequestSchema.safeParse(assessmentRequest)
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      const validatedData = validation.data

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        createdBy,
        'assessment',
        'create',
        undefined,
        { organizationId: validatedData.organizationId.data }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      // Create the assessment
      const assessmentData = {
        organization_id: validatedData.organizationId.data!,
        framework_id: validatedData.frameworkId.data!,
        title: validatedData.title,
        assessment_type: validatedData.assessmentType,
        scope_description: validatedData.scope,
        assessment_period_start: new Date(), // Current date as period start
        assessment_period_end: validatedData.plannedEndDate,
        planned_start_date: validatedData.plannedStartDate,
        planned_end_date: validatedData.plannedEndDate,
        lead_assessor_id: validatedData.leadAssessorId?.data,
        assessment_team: validatedData.assessmentTeam || [],
        requirements_tested: validatedData.requirementsToTest.map(id => 
          createComplianceRequirement(id)
        ).filter(result => result.success).map(result => result.data!),
        methodology: validatedData.methodology,
        cost_estimate: validatedData.budget,
        metadata: {}
      }

      const result = await this.complianceRepository.createComplianceAssessment(assessmentData, createdBy)

      if (result.success) {
        // Log the assessment creation
        await this.logActivity(
          'create_assessment',
          'compliance_assessment',
          result.data!.id,
          {
            frameworkId: validatedData.frameworkId.data,
            organizationId: validatedData.organizationId.data,
            assessmentType: validatedData.assessmentType
          }
        )
      }

      return result
    } catch (error) {
      return this.handleError(error, 'createAssessment')
    }
  }

  async startAssessment(
    assessmentId: ComplianceAssessmentId,
    startedBy: UserId
  ): Promise<Result<any>> {
    try {
      // Check permissions and get assessment details
      const permissionResult = await this.checkPermissionWithContext(
        startedBy,
        'assessment',
        'update',
        assessmentId
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      const result = await this.complianceRepository.startAssessment(assessmentId, startedBy)

      if (result.success) {
        await this.logActivity(
          'start_assessment',
          'compliance_assessment',
          assessmentId,
          { startedBy }
        )

        // Create initial audit entry for regulatory significance
        await this.auditRepository.createAuditLog({
          user_id: startedBy,
          organization_id: result.data!.organization_id as OrganizationId,
          action: 'assessment_started',
          resource_type: 'compliance_assessment',
          resource_id: assessmentId,
          severity: 'medium',
          category: 'compliance',
          regulatory_significance: true,
          business_impact: `Compliance assessment started for ${result.data!.title}`,
          metadata: {
            assessment_type: result.data!.assessment_type,
            framework_id: result.data!.framework_id
          }
        })
      }

      return result
    } catch (error) {
      return this.handleError(error, 'startAssessment')
    }
  }

  // ==========================================
  // VIOLATION MANAGEMENT
  // ==========================================

  async reportViolation(
    violationRequest: z.infer<typeof CreateViolationRequestSchema>,
    reportedBy: UserId
  ): Promise<Result<any>> {
    try {
      const validation = CreateViolationRequestSchema.safeParse(violationRequest)
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      const validatedData = validation.data

      // Generate violation code if not provided
      const violationCode = this.generateViolationCode(
        validatedData.organizationId.data!,
        validatedData.frameworkId?.data,
        validatedData.severity
      )

      const violationData = {
        organization_id: validatedData.organizationId.data!,
        framework_id: validatedData.frameworkId?.data,
        violation_code: violationCode,
        title: validatedData.title,
        description: validatedData.description,
        severity: validatedData.severity,
        category: validatedData.category,
        detected_date: validatedData.detectedDate,
        affected_systems: validatedData.affectedSystems,
        business_impact: validatedData.impactAssessment,
        remediation_plan: validatedData.remediationPlan,
        responsible_party: validatedData.responsibleParty?.data,
        target_resolution_date: validatedData.targetResolutionDate,
        regulatory_reporting_required: validatedData.severity === 'critical',
        legal_review_required: ['high', 'critical'].includes(validatedData.severity),
        customer_notification_required: false // Default, can be updated later
      }

      const result = await this.complianceRepository.createComplianceViolation(violationData, reportedBy)

      if (result.success) {
        const violation = result.data!

        // Create comprehensive audit trail
        await this.auditRepository.createAuditLog({
          user_id: reportedBy,
          organization_id: violation.organization_id,
          action: 'violation_reported',
          resource_type: 'compliance_violation',
          resource_id: violation.id,
          severity: violation.severity as any,
          category: 'compliance',
          regulatory_significance: true,
          business_impact: validatedData.impactAssessment || `${validatedData.severity} compliance violation reported: ${validatedData.title}`,
          risk_level: violation.severity as any,
          metadata: {
            violation_code: violationCode,
            category: validatedData.category,
            affected_systems: validatedData.affectedSystems,
            framework_id: validatedData.frameworkId?.data
          }
        })

        // Auto-trigger notifications for critical violations
        if (violation.severity === 'critical') {
          await this.triggerCriticalViolationWorkflow(violation.id, reportedBy)
        }

        await this.logActivity(
          'report_violation',
          'compliance_violation',
          violation.id,
          {
            severity: violation.severity,
            category: validatedData.category
          }
        )
      }

      return result
    } catch (error) {
      return this.handleError(error, 'reportViolation')
    }
  }

  async updateViolationStatus(
    violationId: ComplianceViolationId,
    newStatus: 'investigating' | 'remediating' | 'resolved' | 'closed',
    updatedBy: UserId,
    notes?: string
  ): Promise<Result<any>> {
    try {
      const permissionResult = await this.checkPermissionWithContext(
        updatedBy,
        'violation',
        'update',
        violationId
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      const result = await this.complianceRepository.updateViolationStatus(
        violationId,
        newStatus,
        updatedBy,
        notes
      )

      if (result.success) {
        const violation = result.data!

        // Create audit entry for status change
        await this.auditRepository.createAuditLog({
          user_id: updatedBy,
          organization_id: violation.organization_id,
          action: 'violation_status_updated',
          resource_type: 'compliance_violation',
          resource_id: violationId,
          old_values: { status: violation.status },
          new_values: { status: newStatus, notes },
          severity: 'medium',
          category: 'compliance',
          regulatory_significance: true,
          business_impact: `Violation ${violation.violation_code} status updated to ${newStatus}`,
          metadata: {
            previous_status: violation.status,
            new_status: newStatus,
            notes
          }
        })

        await this.logActivity(
          'update_violation_status',
          'compliance_violation',
          violationId,
          { newStatus, notes }
        )
      }

      return result
    } catch (error) {
      return this.handleError(error, 'updateViolationStatus')
    }
  }

  // ==========================================
  // DASHBOARD AND REPORTING
  // ==========================================

  async getComplianceDashboard(
    organizationId: OrganizationId,
    userId: UserId,
    frameworkId?: ComplianceFrameworkId
  ): Promise<Result<any>> {
    try {
      const permissionResult = await this.checkPermissionWithContext(
        userId,
        'compliance_dashboard',
        'read',
        undefined,
        { organizationId }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      const dashboardResult = await this.complianceRepository.getComplianceDashboard(
        organizationId,
        frameworkId
      )

      if (!dashboardResult.success) {
        return dashboardResult
      }

      // Enhance with health score
      const healthScoreResult = await this.complianceRepository.generateComplianceHealthScore(
        organizationId,
        frameworkId
      )

      const enhancedDashboard = {
        ...dashboardResult.data,
        healthScore: healthScoreResult.success ? healthScoreResult.data : undefined
      }

      return success(enhancedDashboard)
    } catch (error) {
      return this.handleError(error, 'getComplianceDashboard')
    }
  }

  async generateComplianceReport(
    organizationId: OrganizationId,
    frameworkId: ComplianceFrameworkId,
    reportType: 'executive_summary' | 'detailed_assessment' | 'gap_analysis' | 'roadmap',
    userId: UserId,
    options: {
      includeRecommendations?: boolean
      includeRoadmap?: boolean
      customDateRange?: {
        startDate: Date
        endDate: Date
      }
    } = {}
  ): Promise<Result<{
    reportId: string
    title: string
    generatedAt: Date
    reportType: string
    executiveSummary: string
    sections: Array<{
      title: string
      content: string
      charts?: Array<{
        type: string
        data: any
        config: any
      }>
    }>
    recommendations?: string[]
    attachments?: Array<{
      name: string
      type: string
      url: string
    }>
  }>> {
    try {
      const permissionResult = await this.checkPermissionWithContext(
        userId,
        'compliance_report',
        'create',
        undefined,
        { organizationId, frameworkId }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      let reportSections: any[] = []
      let executiveSummary = ''
      let recommendations: string[] = []

      // Generate content based on report type
      switch (reportType) {
        case 'gap_analysis':
          const gapAnalysis = await this.performGapAnalysis(organizationId, frameworkId)
          if (gapAnalysis.success) {
            executiveSummary = this.generateGapAnalysisExecutiveSummary(gapAnalysis.data)
            reportSections = this.generateGapAnalysisReportSections(gapAnalysis.data)
            recommendations = gapAnalysis.data.recommendedNextSteps
          }
          break

        case 'roadmap':
          const roadmap = await this.generateComplianceRoadmap(
            organizationId, 
            frameworkId, 
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          )
          if (roadmap.success) {
            executiveSummary = this.generateRoadmapExecutiveSummary(roadmap.data)
            reportSections = this.generateRoadmapReportSections(roadmap.data)
          }
          break

        case 'executive_summary':
          const dashboard = await this.getComplianceDashboard(organizationId, userId, frameworkId)
          if (dashboard.success) {
            executiveSummary = this.generateDashboardExecutiveSummary(dashboard.data)
            reportSections = this.generateDashboardReportSections(dashboard.data)
          }
          break

        default:
          return failure(RepositoryError.validation(`Unsupported report type: ${reportType}`))
      }

      // Create the report record
      const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const report = {
        reportId,
        title: `${reportType.replace('_', ' ').toUpperCase()} Report - ${new Date().toLocaleDateString()}`,
        generatedAt: new Date(),
        reportType,
        executiveSummary,
        sections: reportSections,
        recommendations: options.includeRecommendations ? recommendations : undefined
      }

      // Log report generation
      await this.logActivity(
        'generate_report',
        'compliance_report',
        reportId,
        {
          reportType,
          organizationId,
          frameworkId,
          generatedBy: userId
        }
      )

      return success(report)
    } catch (error) {
      return this.handleError(error, 'generateComplianceReport')
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private generateViolationCode(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId,
    severity: string = 'medium'
  ): string {
    const timestamp = Date.now().toString().slice(-8)
    const orgCode = organizationId.slice(-4).toUpperCase()
    const frameworkCode = frameworkId ? frameworkId.slice(-2).toUpperCase() : 'GN'
    const severityCode = severity.charAt(0).toUpperCase()
    
    return `VIO-${orgCode}-${frameworkCode}-${severityCode}-${timestamp}`
  }

  private async triggerCriticalViolationWorkflow(
    violationId: ComplianceViolationId,
    reportedBy: UserId
  ): Promise<void> {
    try {
      // In a real implementation, this would trigger notification workflows,
      // escalation procedures, and potentially external reporting requirements
      
      // For now, just log the trigger
      await this.logActivity(
        'trigger_critical_workflow',
        'compliance_violation',
        violationId,
        {
          trigger: 'critical_violation',
          reportedBy
        }
      )
    } catch (error) {
      console.error('Failed to trigger critical violation workflow:', error)
    }
  }

  private generateGapAnalysisExecutiveSummary(gapAnalysis: ComplianceGapAnalysis): string {
    return `
Compliance Gap Analysis Summary for ${gapAnalysis.frameworkName}:

Overall Compliance Status: ${gapAnalysis.compliancePercentage.toFixed(1)}%
Implementation Progress: ${gapAnalysis.implementedRequirements}/${gapAnalysis.totalRequirements} requirements completed
Outstanding Gaps: ${gapAnalysis.missingRequirements} requirements need attention
Risk Assessment: ${gapAnalysis.riskScore > 50 ? 'High Risk' : gapAnalysis.riskScore > 20 ? 'Medium Risk' : 'Low Risk'}

Key Findings:
${gapAnalysis.implementationGaps
  .filter(gap => gap.riskLevel === 'critical' || gap.riskLevel === 'high')
  .slice(0, 3)
  .map(gap => `• ${gap.title} (${gap.riskLevel} priority)`)
  .join('\n')}

Immediate Action Required: ${gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'critical').length} critical gaps must be addressed urgently.
    `.trim()
  }

  private generateGapAnalysisReportSections(gapAnalysis: ComplianceGapAnalysis): any[] {
    return [
      {
        title: 'Compliance Overview',
        content: `Current compliance level stands at ${gapAnalysis.compliancePercentage.toFixed(1)}% with ${gapAnalysis.implementedRequirements} out of ${gapAnalysis.totalRequirements} requirements fully implemented.`,
        charts: [{
          type: 'donut',
          data: {
            labels: ['Implemented', 'Missing'],
            values: [gapAnalysis.implementedRequirements, gapAnalysis.missingRequirements]
          },
          config: { title: 'Compliance Implementation Status' }
        }]
      },
      {
        title: 'Risk Assessment',
        content: `Risk analysis identifies ${gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'critical').length} critical and ${gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'high').length} high-risk gaps requiring immediate attention.`,
        charts: [{
          type: 'bar',
          data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            values: [
              gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'critical').length,
              gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'high').length,
              gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'medium').length,
              gapAnalysis.implementationGaps.filter(g => g.riskLevel === 'low').length
            ]
          },
          config: { title: 'Risk Level Distribution' }
        }]
      },
      {
        title: 'Implementation Gaps Details',
        content: gapAnalysis.implementationGaps.map(gap => 
          `**${gap.title}** (${gap.riskLevel})\n${gap.recommendedActions.join(', ')}`
        ).join('\n\n')
      }
    ]
  }

  private generateRoadmapExecutiveSummary(roadmap: ComplianceRoadmap): string {
    return `
Compliance Implementation Roadmap:

Timeline: ${roadmap.totalDuration} days across ${roadmap.phases.length} phases
Estimated Cost: $${roadmap.totalCost?.toLocaleString() || 'TBD'}
Total Milestones: ${roadmap.phases.reduce((sum, phase) => sum + phase.milestones.length, 0)}

Key Phases:
${roadmap.phases.map(phase => `• Phase ${phase.phase}: ${phase.title} (${Math.ceil((phase.endDate.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24))} days)`).join('\n')}

Critical Success Factors:
• Adequate resource allocation
• Executive sponsorship and support  
• Change management and training
• Regular progress monitoring

Risk Mitigation: ${roadmap.keyRisks.filter(r => r.impact === 'high' || r.impact === 'critical').length} high-impact risks identified with mitigation strategies.
    `.trim()
  }

  private generateRoadmapReportSections(roadmap: ComplianceRoadmap): any[] {
    return [
      {
        title: 'Implementation Timeline',
        content: `The compliance implementation is structured in ${roadmap.phases.length} phases over ${roadmap.totalDuration} days.`,
        charts: [{
          type: 'gantt',
          data: {
            phases: roadmap.phases.map(phase => ({
              name: phase.title,
              start: phase.startDate,
              end: phase.endDate,
              milestones: phase.milestones.length
            }))
          },
          config: { title: 'Implementation Timeline' }
        }]
      },
      {
        title: 'Resource Requirements',
        content: roadmap.phases.map(phase => 
          `**Phase ${phase.phase}: ${phase.title}**\n${phase.resourceRequirements.map(req => `• ${req.description}: ${req.quantity} ${req.type}`).join('\n')}`
        ).join('\n\n')
      },
      {
        title: 'Risk Analysis',
        content: roadmap.keyRisks.map(risk => 
          `**${risk.risk}** (${risk.impact} impact, ${risk.probability} probability)\nMitigation: ${risk.mitigation}`
        ).join('\n\n')
      }
    ]
  }

  private generateDashboardExecutiveSummary(dashboard: any): string {
    return `
Compliance Dashboard Summary:

Assessment Status: ${dashboard.assessments.completed}/${dashboard.assessments.total} assessments completed
Open Violations: ${dashboard.violations.open} (${dashboard.violations.critical} critical)
Policy Management: ${dashboard.policies.active}/${dashboard.policies.total} active policies
Training Compliance: ${dashboard.training.completionRate.toFixed(1)}% completion rate

${dashboard.healthScore ? `Overall Health Score: ${dashboard.healthScore.overallScore}/100` : ''}

Upcoming Deadlines: ${dashboard.upcomingDeadlines.length} items require attention in the next 30 days.

${dashboard.violations.critical > 0 ? '⚠️ CRITICAL: Immediate attention required for critical violations.' : '✅ No critical violations currently open.'}
    `.trim()
  }

  private generateDashboardReportSections(dashboard: any): any[] {
    return [
      {
        title: 'Assessment Overview',
        content: `Assessment program shows ${dashboard.assessments.completed} completed assessments with ${dashboard.assessments.overdue} overdue.`,
        charts: [{
          type: 'bar',
          data: {
            labels: ['Completed', 'In Progress', 'Planned', 'Overdue'],
            values: [dashboard.assessments.completed, dashboard.assessments.inProgress, dashboard.assessments.planned, dashboard.assessments.overdue]
          },
          config: { title: 'Assessment Status Distribution' }
        }]
      },
      {
        title: 'Violation Management',
        content: `Currently tracking ${dashboard.violations.total} violations with ${dashboard.violations.open} requiring resolution.`,
        charts: [{
          type: 'donut',
          data: {
            labels: Object.keys(dashboard.violations.byCategory),
            values: Object.values(dashboard.violations.byCategory)
          },
          config: { title: 'Violations by Category' }
        }]
      }
    ]
  }
}