import { BaseService } from './base.service'
import { AdvancedComplianceRepository } from '../repositories/advanced-compliance.repository'
import { EnhancedAuditRepository } from '../repositories/enhanced-audit.repository'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import { 
  UserId, 
  OrganizationId, 
  ComplianceFrameworkId,
  ComplianceViolationId,
  createUserId,
  createOrganizationId,
  createComplianceFrameworkId
} from '../../types/branded'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'

// ==========================================
// ADVANCED RISK ASSESSMENT TYPES
// ==========================================

export interface RiskCategory {
  id: string
  name: string
  description: string
  parentCategoryId?: string
  framework: ComplianceFrameworkId
  riskTypes: string[]
  impactFactors: string[]
  likelihoodFactors: string[]
  controlCategories: string[]
  regulatoryPriority: 'low' | 'medium' | 'high' | 'critical'
  businessPriority: 'low' | 'medium' | 'high' | 'critical'
  metadata: Record<string, any>
}

export interface RiskAssessment {
  id: string
  organizationId: OrganizationId
  assessmentName: string
  assessmentType: 'initial' | 'periodic' | 'event_driven' | 'regulatory_required'
  scope: {
    frameworks: ComplianceFrameworkId[]
    businessUnits: string[]
    processes: string[]
    systems: string[]
    geographies: string[]
  }
  methodology: {
    approachType: 'quantitative' | 'qualitative' | 'hybrid'
    riskCriteria: {
      impactScale: 'monetary' | 'categorical' | 'hybrid'
      likelihoodScale: 'frequency' | 'probability' | 'categorical'
      timeHorizon: 'short_term' | 'medium_term' | 'long_term'
      confidenceLevel: number // 0-100
    }
    riskAppetite: {
      overall: 'conservative' | 'moderate' | 'aggressive'
      categories: Record<string, 'low' | 'medium' | 'high'>
      thresholds: {
        residualRisk: number
        inherentRisk: number
        riskVelocity: number
      }
    }
  }
  timeline: {
    assessmentStart: Date
    assessmentEnd: Date
    reportingDeadline: Date
    nextReviewDue: Date
  }
  riskRegister: RiskItem[]
  heatMap: RiskHeatMap
  trends: RiskTrend[]
  recommendations: RiskRecommendation[]
  executiveSummary: string
  status: 'planning' | 'in_progress' | 'review' | 'approved' | 'published' | 'archived'
  assessedBy: UserId[]
  reviewedBy?: UserId
  approvedBy?: UserId
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface RiskItem {
  id: string
  assessmentId: string
  riskName: string
  riskDescription: string
  category: string
  subcategory?: string
  framework: ComplianceFrameworkId
  businessProcess?: string
  system?: string
  geography?: string
  inherentRisk: {
    impact: {
      value: number
      scale: 'monetary' | 'categorical'
      factors: Array<{
        factor: string
        weight: number
        justification: string
      }>
      confidence: number
    }
    likelihood: {
      value: number
      scale: 'frequency' | 'probability' | 'categorical'
      factors: Array<{
        factor: string
        weight: number
        justification: string
      }>
      confidence: number
    }
    exposure: number // calculated: impact * likelihood
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
  }
  existingControls: Array<{
    controlId: string
    controlName: string
    controlType: 'preventive' | 'detective' | 'corrective' | 'directive'
    effectiveness: 'ineffective' | 'partially_effective' | 'largely_effective' | 'fully_effective'
    frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
    automation: 'manual' | 'semi_automated' | 'fully_automated'
    owner: UserId
    lastTested?: Date
    testResults?: string
    gaps: string[]
  }>
  residualRisk: {
    impact: number
    likelihood: number
    exposure: number // calculated after controls
  }
  riskResponse: {
    strategy: 'accept' | 'avoid' | 'mitigate' | 'transfer'
    rationale: string
    actionPlan?: {
      actions: Array<{
        actionId: string
        description: string
        owner: UserId
        priority: 'low' | 'medium' | 'high' | 'critical'
        dueDate: Date
        status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
        progress: number // 0-100
        cost?: number
        expectedReduction: {
          impact?: number
          likelihood?: number
        }
      }>
      totalCost: number
      expectedResidualRisk: number
      paybackPeriod?: number // months
    }
  }
  keyRiskIndicators: Array<{
    kri: string
    currentValue: number
    thresholdGreen: number
    thresholdAmber: number
    thresholdRed: number
    trend: 'improving' | 'stable' | 'deteriorating'
    lastMeasured: Date
    frequency: string
  }>
  regulatoryImplications: {
    reportingRequired: boolean
    notificationRequired: boolean
    regulators: string[]
    penalties: Array<{
      type: 'fine' | 'sanction' | 'restriction' | 'criminal'
      minAmount?: number
      maxAmount?: number
      description: string
    }>
  }
  createdBy: UserId
  lastUpdated: Date
  metadata: Record<string, any>
}

export interface RiskHeatMap {
  assessmentId: string
  dimensions: {
    impactScale: Array<{
      level: number
      label: string
      description: string
      color: string
      monetaryRange?: {
        min: number
        max: number
      }
    }>
    likelihoodScale: Array<{
      level: number
      label: string
      description: string
      frequencyRange?: {
        min: number
        max: number
        unit: 'per_year' | 'per_month' | 'per_week'
      }
      probabilityRange?: {
        min: number
        max: number
      }
    }>
  }
  riskZones: Array<{
    zone: 'low' | 'medium' | 'high' | 'critical'
    color: string
    impactRange: [number, number]
    likelihoodRange: [number, number]
    responseGuideline: string
    escalationRequired: boolean
    reportingFrequency: 'immediate' | 'weekly' | 'monthly' | 'quarterly'
  }>
  riskDistribution: {
    byZone: Record<string, number>
    byCategory: Record<string, number>
    byFramework: Record<string, number>
    total: number
  }
  generatedAt: Date
  metadata: Record<string, any>
}

export interface RiskTrend {
  id: string
  assessmentId: string
  riskItemId?: string // specific risk or overall
  category?: string
  framework?: ComplianceFrameworkId
  trendType: 'overall_risk' | 'category_risk' | 'individual_risk' | 'kri_trend'
  timeframe: {
    startDate: Date
    endDate: Date
    dataPoints: number
  }
  metrics: {
    inherentRisk: Array<{
      date: Date
      value: number
      confidence: number
    }>
    residualRisk: Array<{
      date: Date
      value: number
      confidence: number
    }>
    controlEffectiveness: Array<{
      date: Date
      value: number // percentage
      numberOfControls: number
    }>
    kris: Array<{
      date: Date
      kriId: string
      value: number
      threshold: string
    }>
  }
  analysis: {
    direction: 'improving' | 'stable' | 'deteriorating' | 'volatile'
    velocity: number // rate of change
    significance: 'low' | 'medium' | 'high' | 'critical'
    contributingFactors: string[]
    seasonality: {
      detected: boolean
      pattern?: string
      confidence?: number
    }
    projections: Array<{
      date: Date
      projectedValue: number
      confidence: number
      scenario: 'optimistic' | 'realistic' | 'pessimistic'
    }>
  }
  alerts: Array<{
    alertType: 'threshold_breach' | 'rapid_change' | 'trend_reversal' | 'anomaly'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    triggeredAt: Date
    acknowledged: boolean
    acknowledgedBy?: UserId
  }>
  metadata: Record<string, any>
}

export interface RiskRecommendation {
  id: string
  assessmentId: string
  recommendationType: 'strategic' | 'operational' | 'tactical' | 'immediate'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  rationale: string
  targetRisks: string[] // risk item IDs
  proposedActions: Array<{
    action: string
    type: 'policy' | 'process' | 'technology' | 'training' | 'governance'
    effort: 'low' | 'medium' | 'high'
    cost: 'low' | 'medium' | 'high'
    timeframe: string
    dependencies: string[]
    owner?: string
    expectedBenefit: {
      riskReduction: number // percentage
      costSavings?: number
      efficiencyGains?: string
    }
  }>
  businessCase: {
    currentState: string
    futureState: string
    benefits: string[]
    costs: number
    risks: string[]
    alternatives: string[]
    roi?: number
    paybackPeriod?: number
  }
  implementationPlan: {
    phases: Array<{
      phase: number
      title: string
      duration: number // days
      resources: string[]
      deliverables: string[]
      successCriteria: string[]
    }>
    totalDuration: number
    totalCost: number
    keyMilestones: Array<{
      milestone: string
      date: Date
      dependencies: string[]
    }>
  }
  approval: {
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented'
    submittedBy: UserId
    submittedAt?: Date
    reviewedBy?: UserId
    reviewedAt?: Date
    reviewComments?: string
    approvedBy?: UserId
    approvedAt?: Date
  }
  monitoring: {
    kpis: Array<{
      kpi: string
      target: number
      current?: number
      measurementFrequency: string
    }>
    reviewFrequency: string
    nextReviewDate: Date
  }
  metadata: Record<string, any>
}

export interface MonteCarloRiskSimulation {
  assessmentId: string
  simulationName: string
  parameters: {
    iterations: number
    confidenceInterval: number
    timeHorizon: number // days
    correlations: Array<{
      risk1Id: string
      risk2Id: string
      correlationCoefficient: number
    }>
    scenarios: Array<{
      scenarioName: string
      probability: number
      riskAdjustments: Array<{
        riskId: string
        impactMultiplier: number
        likelihoodMultiplier: number
      }>
    }>
  }
  results: {
    aggregateRisk: {
      mean: number
      median: number
      standardDeviation: number
      percentiles: Array<{
        percentile: number
        value: number
      }>
      var: number // Value at Risk
      cvar: number // Conditional Value at Risk
    }
    riskContributions: Array<{
      riskId: string
      contribution: number // percentage of total risk
      marginalImpact: number
    }>
    sensitivityAnalysis: Array<{
      riskId: string
      parameter: 'impact' | 'likelihood'
      elasticity: number
    }>
    scenarios: Array<{
      scenarioName: string
      probability: number
      totalLoss: number
      topRisks: Array<{
        riskId: string
        loss: number
      }>
    }>
  }
  visualization: {
    histogramData: Array<{
      bucket: string
      frequency: number
    }>
    riskContributionChart: Array<{
      riskId: string
      riskName: string
      contribution: number
    }>
    scenarioComparison: Array<{
      scenario: string
      expectedLoss: number
      probability: number
    }>
  }
  generatedAt: Date
  generatedBy: UserId
  metadata: Record<string, any>
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const RiskAssessmentSchema = z.object({
  organizationId: z.string(),
  assessmentName: z.string().min(1).max(200),
  assessmentType: z.enum(['initial', 'periodic', 'event_driven', 'regulatory_required']),
  scope: z.object({
    frameworks: z.array(z.string()),
    businessUnits: z.array(z.string()),
    processes: z.array(z.string()),
    systems: z.array(z.string()),
    geographies: z.array(z.string())
  }),
  methodology: z.object({
    approachType: z.enum(['quantitative', 'qualitative', 'hybrid']),
    riskCriteria: z.object({
      impactScale: z.enum(['monetary', 'categorical', 'hybrid']),
      likelihoodScale: z.enum(['frequency', 'probability', 'categorical']),
      timeHorizon: z.enum(['short_term', 'medium_term', 'long_term']),
      confidenceLevel: z.number().min(0).max(100)
    }),
    riskAppetite: z.object({
      overall: z.enum(['conservative', 'moderate', 'aggressive']),
      categories: z.record(z.enum(['low', 'medium', 'high'])),
      thresholds: z.object({
        residualRisk: z.number(),
        inherentRisk: z.number(),
        riskVelocity: z.number()
      })
    })
  }),
  timeline: z.object({
    assessmentStart: z.date(),
    assessmentEnd: z.date(),
    reportingDeadline: z.date(),
    nextReviewDue: z.date()
  })
})

const RiskItemSchema = z.object({
  riskName: z.string().min(1).max(200),
  riskDescription: z.string().min(1),
  category: z.string(),
  subcategory: z.string().optional(),
  framework: z.string(),
  businessProcess: z.string().optional(),
  system: z.string().optional(),
  geography: z.string().optional(),
  inherentRisk: z.object({
    impact: z.object({
      value: z.number().min(1).max(5),
      scale: z.enum(['monetary', 'categorical']),
      factors: z.array(z.object({
        factor: z.string(),
        weight: z.number().min(0).max(1),
        justification: z.string()
      })),
      confidence: z.number().min(0).max(100)
    }),
    likelihood: z.object({
      value: z.number().min(1).max(5),
      scale: z.enum(['frequency', 'probability', 'categorical']),
      factors: z.array(z.object({
        factor: z.string(),
        weight: z.number().min(0).max(1),
        justification: z.string()
      })),
      confidence: z.number().min(0).max(100)
    }),
    timeframe: z.enum(['immediate', 'short_term', 'medium_term', 'long_term'])
  }),
  riskResponse: z.object({
    strategy: z.enum(['accept', 'avoid', 'mitigate', 'transfer']),
    rationale: z.string()
  })
})

// ==========================================
// ADVANCED RISK ASSESSMENT ENGINE SERVICE
// ==========================================

export class AdvancedRiskAssessmentEngineService extends BaseService {
  private complianceRepository: AdvancedComplianceRepository
  private auditRepository: EnhancedAuditRepository
  private riskAssessments: Map<string, RiskAssessment> = new Map()
  private riskCategories: Map<ComplianceFrameworkId, RiskCategory[]> = new Map()
  private simulationEngine: Map<string, MonteCarloRiskSimulation> = new Map()

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.complianceRepository = new AdvancedComplianceRepository(supabase)
    this.auditRepository = new EnhancedAuditRepository(supabase)
    this.initializeRiskCategories()
  }

  private async initializeRiskCategories(): Promise<void> {
    // Initialize standard risk categories for major frameworks
    const categories = await this.loadStandardRiskCategories()
    categories.forEach(category => {
      const frameworkCategories = this.riskCategories.get(category.framework) || []
      frameworkCategories.push(category)
      this.riskCategories.set(category.framework, frameworkCategories)
    })
  }

  private async loadStandardRiskCategories(): Promise<RiskCategory[]> {
    return [
      {
        id: 'sox-financial-reporting',
        name: 'Financial Reporting Risk',
        description: 'Risks related to accuracy and completeness of financial reporting',
        framework: 'sox' as ComplianceFrameworkId,
        riskTypes: ['misstatement', 'fraud', 'disclosure_failure', 'control_deficiency'],
        impactFactors: ['materiality', 'investor_confidence', 'regulatory_scrutiny', 'share_price'],
        likelihoodFactors: ['control_effectiveness', 'process_complexity', 'staff_competence', 'system_reliability'],
        controlCategories: ['entity_level', 'process_level', 'it_general', 'it_application'],
        regulatoryPriority: 'critical',
        businessPriority: 'critical',
        metadata: {
          regulatoryBody: 'SEC',
          penalties: ['fines', 'officer_bars', 'criminal_charges'],
          reportingRequirements: ['10-K', '10-Q', '8-K', 'proxy_statements']
        }
      },
      {
        id: 'gdpr-data-protection',
        name: 'Data Protection Risk',
        description: 'Risks related to personal data processing and privacy violations',
        framework: 'gdpr' as ComplianceFrameworkId,
        riskTypes: ['data_breach', 'unauthorized_processing', 'consent_violations', 'cross_border_transfers'],
        impactFactors: ['data_volume', 'data_sensitivity', 'affected_individuals', 'reputational_damage'],
        likelihoodFactors: ['security_maturity', 'process_adherence', 'third_party_risk', 'employee_awareness'],
        controlCategories: ['technical_measures', 'organizational_measures', 'privacy_by_design', 'consent_management'],
        regulatoryPriority: 'critical',
        businessPriority: 'high',
        metadata: {
          regulatoryBody: 'Data Protection Authorities',
          penalties: ['administrative_fines', 'processing_bans', 'compensation_claims'],
          maxFine: 20000000, // €20 million or 4% of annual turnover
          reportingRequirements: ['breach_notification_72h', 'dpia', 'records_of_processing']
        }
      },
      {
        id: 'operational-risk',
        name: 'Operational Risk',
        description: 'Risk of loss resulting from inadequate or failed processes, people, and systems',
        framework: 'basel' as ComplianceFrameworkId,
        riskTypes: ['process_failure', 'system_failure', 'human_error', 'external_events'],
        impactFactors: ['financial_loss', 'service_disruption', 'regulatory_impact', 'reputational_damage'],
        likelihoodFactors: ['process_maturity', 'technology_stability', 'staff_training', 'change_frequency'],
        controlCategories: ['preventive', 'detective', 'corrective', 'compensating'],
        regulatoryPriority: 'high',
        businessPriority: 'high',
        metadata: {
          businessLines: ['corporate_finance', 'trading_sales', 'retail_banking', 'commercial_banking'],
          eventTypes: ['internal_fraud', 'external_fraud', 'employment_practices', 'clients_products_business']
        }
      }
    ]
  }

  // ==========================================
  // RISK ASSESSMENT MANAGEMENT
  // ==========================================

  async createRiskAssessment(
    assessmentData: Omit<RiskAssessment, 'id' | 'riskRegister' | 'heatMap' | 'trends' | 'recommendations' | 'executiveSummary' | 'status' | 'createdAt' | 'updatedAt'>,
    createdBy: UserId
  ): Promise<Result<RiskAssessment>> {
    try {
      const validation = RiskAssessmentSchema.safeParse({
        ...assessmentData,
        organizationId: assessmentData.organizationId.toString()
      })
      
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      const assessment: RiskAssessment = {
        ...assessmentData,
        id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        riskRegister: [],
        heatMap: this.initializeHeatMap(assessmentData.methodology),
        trends: [],
        recommendations: [],
        executiveSummary: '',
        status: 'planning',
        assessedBy: [createdBy],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Store assessment
      this.riskAssessments.set(assessment.id, assessment)

      // Log activity
      await this.logActivity(
        'create_risk_assessment',
        'risk_assessment',
        assessment.id,
        {
          organizationId: assessmentData.organizationId,
          assessmentType: assessmentData.assessmentType,
          frameworks: assessmentData.scope.frameworks.length
        }
      )

      return success(assessment)
    } catch (error) {
      return this.handleError(error, 'createRiskAssessment')
    }
  }

  async addRiskItem(
    assessmentId: string,
    riskData: Omit<RiskItem, 'id' | 'assessmentId' | 'residualRisk' | 'createdBy' | 'lastUpdated' | 'metadata'>,
    createdBy: UserId
  ): Promise<Result<RiskItem>> {
    try {
      const assessment = this.riskAssessments.get(assessmentId)
      if (!assessment) {
        return failure(RepositoryError.notFound('Risk assessment not found'))
      }

      const validation = RiskItemSchema.safeParse(riskData)
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      // Calculate residual risk based on existing controls
      const residualRisk = this.calculateResidualRisk(riskData.inherentRisk, riskData.existingControls)

      const riskItem: RiskItem = {
        ...riskData,
        id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assessmentId,
        residualRisk,
        createdBy,
        lastUpdated: new Date(),
        metadata: {
          version: 1,
          calculationMethod: 'standard',
          confidence: Math.min(
            riskData.inherentRisk.impact.confidence,
            riskData.inherentRisk.likelihood.confidence
          )
        }
      }

      // Add to assessment
      assessment.riskRegister.push(riskItem)
      assessment.updatedAt = new Date()

      // Update heat map
      assessment.heatMap = await this.generateRiskHeatMap(assessment)

      // Generate KRIs if not provided
      if (riskItem.keyRiskIndicators.length === 0) {
        riskItem.keyRiskIndicators = await this.generateDefaultKRIs(riskItem)
      }

      await this.logActivity(
        'add_risk_item',
        'risk_item',
        riskItem.id,
        {
          assessmentId,
          riskCategory: riskData.category,
          inherentExposure: riskData.inherentRisk.exposure,
          residualExposure: residualRisk.exposure
        }
      )

      return success(riskItem)
    } catch (error) {
      return this.handleError(error, 'addRiskItem')
    }
  }

  private calculateResidualRisk(
    inherentRisk: RiskItem['inherentRisk'],
    controls: RiskItem['existingControls']
  ): RiskItem['residualRisk'] {
    // Calculate control effectiveness
    let totalEffectiveness = 0
    let weightedEffectiveness = 0

    controls.forEach(control => {
      const effectivenessScore = this.getEffectivenessScore(control.effectiveness)
      const automationMultiplier = this.getAutomationMultiplier(control.automation)
      const frequencyMultiplier = this.getFrequencyMultiplier(control.frequency)
      
      const adjustedEffectiveness = effectivenessScore * automationMultiplier * frequencyMultiplier
      weightedEffectiveness += adjustedEffectiveness
      totalEffectiveness += 1
    })

    const averageEffectiveness = totalEffectiveness > 0 
      ? Math.min(0.95, weightedEffectiveness / totalEffectiveness) 
      : 0

    // Apply control effectiveness to reduce risk
    const impactReduction = averageEffectiveness * 0.7 // Max 70% impact reduction
    const likelihoodReduction = averageEffectiveness * 0.8 // Max 80% likelihood reduction

    const residualImpact = inherentRisk.impact.value * (1 - impactReduction)
    const residualLikelihood = inherentRisk.likelihood.value * (1 - likelihoodReduction)
    const residualExposure = residualImpact * residualLikelihood

    return {
      impact: Math.max(1, residualImpact),
      likelihood: Math.max(1, residualLikelihood),
      exposure: residualExposure
    }
  }

  private getEffectivenessScore(effectiveness: string): number {
    const scores = {
      'ineffective': 0.1,
      'partially_effective': 0.4,
      'largely_effective': 0.7,
      'fully_effective': 0.9
    }
    return scores[effectiveness as keyof typeof scores] || 0.1
  }

  private getAutomationMultiplier(automation: string): number {
    const multipliers = {
      'manual': 0.8,
      'semi_automated': 0.9,
      'fully_automated': 1.0
    }
    return multipliers[automation as keyof typeof multipliers] || 0.8
  }

  private getFrequencyMultiplier(frequency: string): number {
    const multipliers = {
      'continuous': 1.0,
      'daily': 0.95,
      'weekly': 0.9,
      'monthly': 0.8,
      'quarterly': 0.7,
      'annual': 0.6,
      'ad_hoc': 0.4
    }
    return multipliers[frequency as keyof typeof multipliers] || 0.4
  }

  private async generateDefaultKRIs(riskItem: RiskItem): Promise<RiskItem['keyRiskIndicators']> {
    const kris: RiskItem['keyRiskIndicators'] = []

    // Generate KRIs based on risk category
    switch (riskItem.category) {
      case 'Financial Reporting Risk':
        kris.push(
          {
            kri: 'Journal Entry Volume',
            currentValue: 1250,
            thresholdGreen: 1000,
            thresholdAmber: 1500,
            thresholdRed: 2000,
            trend: 'stable',
            lastMeasured: new Date(),
            frequency: 'monthly'
          },
          {
            kri: 'Material Weakness Count',
            currentValue: 2,
            thresholdGreen: 0,
            thresholdAmber: 2,
            thresholdRed: 5,
            trend: 'improving',
            lastMeasured: new Date(),
            frequency: 'quarterly'
          }
        )
        break

      case 'Data Protection Risk':
        kris.push(
          {
            kri: 'Data Breach Incidents',
            currentValue: 0,
            thresholdGreen: 0,
            thresholdAmber: 1,
            thresholdRed: 3,
            trend: 'stable',
            lastMeasured: new Date(),
            frequency: 'monthly'
          },
          {
            kri: 'Privacy Training Completion %',
            currentValue: 85,
            thresholdGreen: 95,
            thresholdAmber: 80,
            thresholdRed: 70,
            trend: 'improving',
            lastMeasured: new Date(),
            frequency: 'quarterly'
          }
        )
        break

      default:
        kris.push({
          kri: 'Control Effectiveness Score',
          currentValue: 75,
          thresholdGreen: 90,
          thresholdAmber: 70,
          thresholdRed: 50,
          trend: 'stable',
          lastMeasured: new Date(),
          frequency: 'monthly'
        })
    }

    return kris
  }

  // ==========================================
  // HEAT MAP GENERATION
  // ==========================================

  private initializeHeatMap(methodology: RiskAssessment['methodology']): RiskHeatMap {
    return {
      assessmentId: '',
      dimensions: {
        impactScale: [
          { level: 1, label: 'Negligible', description: 'Minimal impact on operations', color: '#90EE90' },
          { level: 2, label: 'Minor', description: 'Limited impact, manageable', color: '#FFFF99' },
          { level: 3, label: 'Moderate', description: 'Noticeable impact, requires attention', color: '#FFD700' },
          { level: 4, label: 'Major', description: 'Significant impact, immediate action required', color: '#FFA500' },
          { level: 5, label: 'Severe', description: 'Critical impact, business threatening', color: '#FF6B6B' }
        ],
        likelihoodScale: [
          { level: 1, label: 'Rare', description: 'Unlikely to occur', frequencyRange: { min: 0, max: 0.1, unit: 'per_year' } },
          { level: 2, label: 'Unlikely', description: 'Low probability of occurrence', frequencyRange: { min: 0.1, max: 0.5, unit: 'per_year' } },
          { level: 3, label: 'Possible', description: 'Moderate probability', frequencyRange: { min: 0.5, max: 2, unit: 'per_year' } },
          { level: 4, label: 'Likely', description: 'High probability of occurrence', frequencyRange: { min: 2, max: 5, unit: 'per_year' } },
          { level: 5, label: 'Almost Certain', description: 'Very high probability', frequencyRange: { min: 5, max: 100, unit: 'per_year' } }
        ]
      },
      riskZones: [
        { zone: 'low', color: '#90EE90', impactRange: [1, 2], likelihoodRange: [1, 2], responseGuideline: 'Monitor and accept', escalationRequired: false, reportingFrequency: 'quarterly' },
        { zone: 'medium', color: '#FFFF99', impactRange: [1, 4], likelihoodRange: [1, 4], responseGuideline: 'Manage and monitor', escalationRequired: false, reportingFrequency: 'monthly' },
        { zone: 'high', color: '#FFA500', impactRange: [3, 5], likelihoodRange: [3, 5], responseGuideline: 'Active management required', escalationRequired: true, reportingFrequency: 'weekly' },
        { zone: 'critical', color: '#FF6B6B', impactRange: [4, 5], likelihoodRange: [4, 5], responseGuideline: 'Immediate action required', escalationRequired: true, reportingFrequency: 'immediate' }
      ],
      riskDistribution: {
        byZone: {},
        byCategory: {},
        byFramework: {},
        total: 0
      },
      generatedAt: new Date(),
      metadata: {}
    }
  }

  async generateRiskHeatMap(assessment: RiskAssessment): Promise<RiskHeatMap> {
    const heatMap = this.initializeHeatMap(assessment.methodology)
    heatMap.assessmentId = assessment.id

    // Calculate risk distribution
    assessment.riskRegister.forEach(risk => {
      heatMap.riskDistribution.total++

      // By zone
      const zone = this.determineRiskZone(risk.residualRisk.impact, risk.residualRisk.likelihood, heatMap.riskZones)
      heatMap.riskDistribution.byZone[zone] = (heatMap.riskDistribution.byZone[zone] || 0) + 1

      // By category
      heatMap.riskDistribution.byCategory[risk.category] = (heatMap.riskDistribution.byCategory[risk.category] || 0) + 1

      // By framework
      const framework = risk.framework.toString()
      heatMap.riskDistribution.byFramework[framework] = (heatMap.riskDistribution.byFramework[framework] || 0) + 1
    })

    heatMap.generatedAt = new Date()
    return heatMap
  }

  private determineRiskZone(impact: number, likelihood: number, zones: RiskHeatMap['riskZones']): string {
    // Find the appropriate zone based on impact and likelihood
    for (const zone of zones.reverse()) { // Check highest zones first
      const impactInRange = impact >= zone.impactRange[0] && impact <= zone.impactRange[1]
      const likelihoodInRange = likelihood >= zone.likelihoodRange[0] && likelihood <= zone.likelihoodRange[1]
      
      if (impactInRange && likelihoodInRange) {
        return zone.zone
      }
    }
    return 'low' // Default to low if no match
  }

  // ==========================================
  // TREND ANALYSIS
  // ==========================================

  async generateRiskTrends(
    assessmentId: string,
    historicalPeriod: { startDate: Date, endDate: Date },
    userId: UserId
  ): Promise<Result<RiskTrend[]>> {
    try {
      const assessment = this.riskAssessments.get(assessmentId)
      if (!assessment) {
        return failure(RepositoryError.notFound('Risk assessment not found'))
      }

      const trends: RiskTrend[] = []

      // Generate overall risk trend
      const overallTrend = await this.calculateOverallRiskTrend(assessment, historicalPeriod)
      trends.push(overallTrend)

      // Generate category-specific trends
      const categories = [...new Set(assessment.riskRegister.map(r => r.category))]
      for (const category of categories) {
        const categoryTrend = await this.calculateCategoryRiskTrend(assessment, category, historicalPeriod)
        trends.push(categoryTrend)
      }

      // Generate KRI trends
      for (const risk of assessment.riskRegister) {
        for (const kri of risk.keyRiskIndicators) {
          const kriTrend = await this.calculateKRITrend(risk, kri, historicalPeriod)
          trends.push(kriTrend)
        }
      }

      // Update assessment with trends
      assessment.trends = trends
      assessment.updatedAt = new Date()

      await this.logActivity(
        'generate_risk_trends',
        'risk_trends',
        assessmentId,
        {
          trendsGenerated: trends.length,
          historicalPeriod: `${historicalPeriod.startDate.toISOString().split('T')[0]} to ${historicalPeriod.endDate.toISOString().split('T')[0]}`
        }
      )

      return success(trends)
    } catch (error) {
      return this.handleError(error, 'generateRiskTrends')
    }
  }

  private async calculateOverallRiskTrend(
    assessment: RiskAssessment,
    period: { startDate: Date, endDate: Date }
  ): Promise<RiskTrend> {
    // This would typically query historical data
    // For demo purposes, we'll simulate trend data
    const dataPoints = this.generateSimulatedTrendData(period, 'overall')

    const trend: RiskTrend = {
      id: `trend_overall_${Date.now()}`,
      assessmentId: assessment.id,
      trendType: 'overall_risk',
      timeframe: {
        startDate: period.startDate,
        endDate: period.endDate,
        dataPoints: dataPoints.length
      },
      metrics: {
        inherentRisk: dataPoints.map(point => ({
          date: point.date,
          value: point.inherentRisk,
          confidence: 85
        })),
        residualRisk: dataPoints.map(point => ({
          date: point.date,
          value: point.residualRisk,
          confidence: 90
        })),
        controlEffectiveness: dataPoints.map(point => ({
          date: point.date,
          value: point.controlEffectiveness,
          numberOfControls: 25
        })),
        kris: []
      },
      analysis: this.analyzeTrendDirection(dataPoints),
      alerts: await this.generateTrendAlerts(dataPoints, 'overall'),
      metadata: {
        calculationMethod: 'weighted_average',
        dataQuality: 'high'
      }
    }

    return trend
  }

  private async calculateCategoryRiskTrend(
    assessment: RiskAssessment,
    category: string,
    period: { startDate: Date, endDate: Date }
  ): Promise<RiskTrend> {
    const categoryRisks = assessment.riskRegister.filter(r => r.category === category)
    const dataPoints = this.generateSimulatedTrendData(period, 'category')

    return {
      id: `trend_category_${category}_${Date.now()}`,
      assessmentId: assessment.id,
      category,
      trendType: 'category_risk',
      timeframe: {
        startDate: period.startDate,
        endDate: period.endDate,
        dataPoints: dataPoints.length
      },
      metrics: {
        inherentRisk: dataPoints.map(point => ({
          date: point.date,
          value: point.inherentRisk,
          confidence: 80
        })),
        residualRisk: dataPoints.map(point => ({
          date: point.date,
          value: point.residualRisk,
          confidence: 85
        })),
        controlEffectiveness: dataPoints.map(point => ({
          date: point.date,
          value: point.controlEffectiveness,
          numberOfControls: categoryRisks.reduce((sum, r) => sum + r.existingControls.length, 0)
        })),
        kris: []
      },
      analysis: this.analyzeTrendDirection(dataPoints),
      alerts: await this.generateTrendAlerts(dataPoints, category),
      metadata: {
        riskCount: categoryRisks.length,
        category
      }
    }
  }

  private async calculateKRITrend(
    risk: RiskItem,
    kri: RiskItem['keyRiskIndicators'][0],
    period: { startDate: Date, endDate: Date }
  ): Promise<RiskTrend> {
    // Simulate KRI historical data
    const kriData = this.generateKRIHistoricalData(kri, period)

    return {
      id: `trend_kri_${kri.kri}_${Date.now()}`,
      assessmentId: risk.assessmentId,
      riskItemId: risk.id,
      trendType: 'kri_trend',
      timeframe: {
        startDate: period.startDate,
        endDate: period.endDate,
        dataPoints: kriData.length
      },
      metrics: {
        inherentRisk: [],
        residualRisk: [],
        controlEffectiveness: [],
        kris: kriData.map(point => ({
          date: point.date,
          kriId: kri.kri,
          value: point.value,
          threshold: point.threshold
        }))
      },
      analysis: this.analyzeKRITrend(kriData, kri),
      alerts: await this.generateKRIAlerts(kriData, kri),
      metadata: {
        kri: kri.kri,
        riskId: risk.id,
        frequency: kri.frequency
      }
    }
  }

  private generateSimulatedTrendData(
    period: { startDate: Date, endDate: Date },
    type: string
  ): Array<{ date: Date, inherentRisk: number, residualRisk: number, controlEffectiveness: number }> {
    const points: Array<any> = []
    const daysDiff = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const interval = Math.max(1, Math.floor(daysDiff / 12)) // 12 data points

    for (let i = 0; i <= 12; i++) {
      const date = new Date(period.startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000))
      
      // Simulate trending data with some noise
      const baseInherent = 12 + Math.sin(i * 0.5) * 2 + (Math.random() - 0.5) * 1
      const baseResidual = baseInherent * 0.6 + Math.sin(i * 0.3) * 1 + (Math.random() - 0.5) * 0.5
      const controlEff = 75 + Math.cos(i * 0.4) * 10 + (Math.random() - 0.5) * 5

      points.push({
        date,
        inherentRisk: Math.max(5, Math.min(25, baseInherent)),
        residualRisk: Math.max(3, Math.min(15, baseResidual)),
        controlEffectiveness: Math.max(50, Math.min(95, controlEff))
      })
    }

    return points
  }

  private generateKRIHistoricalData(
    kri: RiskItem['keyRiskIndicators'][0],
    period: { startDate: Date, endDate: Date }
  ): Array<{ date: Date, value: number, threshold: string }> {
    const points: Array<any> = []
    const daysDiff = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 1000 * 24))
    const interval = Math.max(1, Math.floor(daysDiff / 20)) // 20 data points

    for (let i = 0; i <= 20; i++) {
      const date = new Date(period.startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000))
      const baseValue = kri.currentValue + Math.sin(i * 0.3) * (kri.currentValue * 0.2) + (Math.random() - 0.5) * (kri.currentValue * 0.1)
      
      let threshold = 'green'
      if (baseValue >= kri.thresholdRed) threshold = 'red'
      else if (baseValue >= kri.thresholdAmber) threshold = 'amber'

      points.push({
        date,
        value: Math.max(0, baseValue),
        threshold
      })
    }

    return points
  }

  private analyzeTrendDirection(dataPoints: Array<any>): RiskTrend['analysis'] {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        velocity: 0,
        significance: 'low',
        contributingFactors: [],
        seasonality: { detected: false },
        projections: []
      }
    }

    // Calculate trend direction using linear regression
    const n = dataPoints.length
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

    dataPoints.forEach((point, index) => {
      sumX += index
      sumY += point.residualRisk
      sumXY += index * point.residualRisk
      sumXX += index * index
    })

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const velocity = Math.abs(slope)

    let direction: RiskTrend['analysis']['direction'] = 'stable'
    if (slope > 0.1) direction = 'deteriorating'
    else if (slope < -0.1) direction = 'improving'
    else if (velocity > 0.5) direction = 'volatile'

    let significance: RiskTrend['analysis']['significance'] = 'low'
    if (velocity > 1) significance = 'critical'
    else if (velocity > 0.5) significance = 'high'
    else if (velocity > 0.2) significance = 'medium'

    // Generate projections
    const projections: RiskTrend['analysis']['projections'] = []
    const lastValue = dataPoints[dataPoints.length - 1].residualRisk
    const futureMonths = [1, 3, 6, 12]

    futureMonths.forEach(months => {
      const projectedChange = slope * months
      projections.push({
        date: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000),
        projectedValue: Math.max(0, lastValue + projectedChange),
        confidence: Math.max(50, 90 - months * 10),
        scenario: 'realistic'
      })
    })

    return {
      direction,
      velocity,
      significance,
      contributingFactors: this.identifyContributingFactors(direction, velocity),
      seasonality: { detected: false }, // Would need more sophisticated analysis
      projections
    }
  }

  private analyzeKRITrend(
    kriData: Array<{ date: Date, value: number, threshold: string }>,
    kri: RiskItem['keyRiskIndicators'][0]
  ): RiskTrend['analysis'] {
    const values = kriData.map(d => d.value)
    const recent = values.slice(-5)
    const earlier = values.slice(0, 5)

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
    const percentChange = ((recentAvg - earlierAvg) / earlierAvg) * 100

    let direction: RiskTrend['analysis']['direction'] = 'stable'
    if (Math.abs(percentChange) > 20) direction = 'volatile'
    else if (percentChange > 10) direction = kri.kri.includes('Completion') ? 'improving' : 'deteriorating'
    else if (percentChange < -10) direction = kri.kri.includes('Completion') ? 'deteriorating' : 'improving'

    return {
      direction,
      velocity: Math.abs(percentChange) / 100,
      significance: Math.abs(percentChange) > 30 ? 'critical' : 
                   Math.abs(percentChange) > 20 ? 'high' :
                   Math.abs(percentChange) > 10 ? 'medium' : 'low',
      contributingFactors: [`KRI ${direction} by ${Math.abs(percentChange).toFixed(1)}%`],
      seasonality: { detected: false },
      projections: []
    }
  }

  private identifyContributingFactors(direction: string, velocity: number): string[] {
    const factors: string[] = []

    if (direction === 'deteriorating') {
      factors.push('Increasing regulatory requirements')
      factors.push('System complexity growth')
      if (velocity > 0.5) factors.push('Rapid business changes')
    } else if (direction === 'improving') {
      factors.push('Enhanced control implementation')
      factors.push('Improved risk management processes')
      if (velocity > 0.5) factors.push('Significant investment in compliance')
    } else if (direction === 'volatile') {
      factors.push('Inconsistent control execution')
      factors.push('External environment changes')
      factors.push('Measurement methodology variations')
    }

    return factors
  }

  private async generateTrendAlerts(dataPoints: Array<any>, context: string): Promise<RiskTrend['alerts']> {
    const alerts: RiskTrend['alerts'] = []
    const latestPoint = dataPoints[dataPoints.length - 1]
    const previousPoint = dataPoints[dataPoints.length - 2]

    if (latestPoint && previousPoint) {
      const change = ((latestPoint.residualRisk - previousPoint.residualRisk) / previousPoint.residualRisk) * 100

      if (Math.abs(change) > 25) {
        alerts.push({
          alertType: 'rapid_change',
          severity: Math.abs(change) > 50 ? 'critical' : 'high',
          description: `${context} risk changed by ${change.toFixed(1)}% in the latest period`,
          triggeredAt: new Date(),
          acknowledged: false
        })
      }

      if (latestPoint.residualRisk > 15) {
        alerts.push({
          alertType: 'threshold_breach',
          severity: 'high',
          description: `${context} risk level exceeds acceptable threshold`,
          triggeredAt: new Date(),
          acknowledged: false
        })
      }
    }

    return alerts
  }

  private async generateKRIAlerts(
    kriData: Array<{ date: Date, value: number, threshold: string }>,
    kri: RiskItem['keyRiskIndicators'][0]
  ): Promise<RiskTrend['alerts']> {
    const alerts: RiskTrend['alerts'] = []
    const latestPoint = kriData[kriData.length - 1]

    if (latestPoint.threshold === 'red') {
      alerts.push({
        alertType: 'threshold_breach',
        severity: 'critical',
        description: `KRI "${kri.kri}" has breached critical threshold (${latestPoint.value} > ${kri.thresholdRed})`,
        triggeredAt: latestPoint.date,
        acknowledged: false
      })
    } else if (latestPoint.threshold === 'amber') {
      alerts.push({
        alertType: 'threshold_breach',
        severity: 'medium',
        description: `KRI "${kri.kri}" has exceeded warning threshold (${latestPoint.value} > ${kri.thresholdAmber})`,
        triggeredAt: latestPoint.date,
        acknowledged: false
      })
    }

    return alerts
  }
}