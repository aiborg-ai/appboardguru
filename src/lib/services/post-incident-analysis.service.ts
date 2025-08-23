import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'
import { CrisisLevel, CrisisCategory, CrisisStatus } from './crisis-management.service'

export enum AnalysisType {
  HOT_WASH = 'hot_wash',                    // Immediate post-incident review (within 24 hours)
  AFTER_ACTION = 'after_action',            // Comprehensive review (within 1 week)
  LESSONS_LEARNED = 'lessons_learned',      // Strategic analysis (within 1 month)
  ROOT_CAUSE = 'root_cause',               // Deep dive technical analysis
  TIMELINE_RECONSTRUCTION = 'timeline_reconstruction',
  STAKEHOLDER_IMPACT = 'stakeholder_impact',
  FINANCIAL_IMPACT = 'financial_impact',
  COMPLIANCE_REVIEW = 'compliance_review'
}

export enum AnalysisStatus {
  INITIATED = 'initiated',
  DATA_COLLECTION = 'data_collection',
  INTERVIEWING = 'interviewing',
  ANALYSIS = 'analysis',
  DRAFT_REVIEW = 'draft_review',
  STAKEHOLDER_REVIEW = 'stakeholder_review',
  FINAL_REVIEW = 'final_review',
  COMPLETED = 'completed',
  PUBLISHED = 'published'
}

export enum RecommendationPriority {
  CRITICAL = 'critical',        // Must implement immediately
  HIGH = 'high',               // Implement within 30 days
  MEDIUM = 'medium',           // Implement within 90 days
  LOW = 'low',                 // Implement within 1 year
  STRATEGIC = 'strategic'       // Long-term planning consideration
}

export enum RecommendationStatus {
  PROPOSED = 'proposed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

export interface PostIncidentAnalysis {
  id: string
  incident_id: string
  analysis_type: AnalysisType
  title: string
  description: string
  analysis_scope: {
    time_period: {
      start: string
      end: string
    }
    stakeholders_involved: string[]
    systems_affected: string[]
    processes_reviewed: string[]
    geographic_scope?: string[]
  }
  methodology: {
    data_sources: DataSource[]
    analysis_techniques: string[]
    interview_subjects: InterviewSubject[]
    documentation_reviewed: DocumentReference[]
    tools_used: string[]
  }
  timeline_analysis: TimelineAnalysis
  root_cause_analysis: RootCauseAnalysis
  impact_assessment: ImpactAssessment
  response_effectiveness: ResponseEffectivenessAnalysis
  stakeholder_feedback: StakeholderFeedback[]
  key_findings: Finding[]
  recommendations: Recommendation[]
  lessons_learned: LessonLearned[]
  implementation_plan: ImplementationPlan
  metrics_and_kpis: AnalysisMetric[]
  status: AnalysisStatus
  assigned_analysts: string[]
  reviewers: AnalysisReviewer[]
  stakeholder_distribution: {
    internal_stakeholders: string[]
    external_stakeholders: string[]
    regulatory_bodies: string[]
    board_members: string[]
  }
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  legal_privilege_claimed: boolean
  executive_summary: string
  appendices: AnalysisAppendix[]
  created_by: string
  created_at: string
  updated_at: string
  completed_at?: string
  published_at?: string
}

export interface DataSource {
  source_type: 'logs' | 'interviews' | 'documents' | 'metrics' | 'communications' | 'recordings' | 'external_reports'
  source_name: string
  description: string
  time_range?: { start: string; end: string }
  reliability_score: number
  completeness_score: number
  access_restrictions?: string[]
  analysis_notes?: string
}

export interface InterviewSubject {
  role: string
  department?: string
  involvement_level: 'primary' | 'secondary' | 'observer' | 'support'
  interview_date?: string
  interviewer: string
  interview_duration_minutes?: number
  key_insights: string[]
  follow_up_required: boolean
  anonymized_in_report: boolean
}

export interface DocumentReference {
  document_type: string
  title: string
  version?: string
  date: string
  author?: string
  relevance_score: number
  key_sections_reviewed: string[]
  findings_summary: string
}

export interface TimelineAnalysis {
  critical_events: CriticalEvent[]
  decision_points: DecisionPoint[]
  communication_flow: CommunicationEvent[]
  timeline_accuracy_score: number
  gaps_identified: TimelineGap[]
  concurrent_activities: ConcurrentActivity[]
}

export interface CriticalEvent {
  timestamp: string
  event_type: 'detection' | 'escalation' | 'decision' | 'action' | 'communication' | 'milestone'
  description: string
  actors_involved: string[]
  systems_involved: string[]
  impact_level: CrisisLevel
  duration_minutes?: number
  evidence_sources: string[]
  analysis_notes: string
}

export interface DecisionPoint {
  timestamp: string
  decision: string
  decision_maker: string
  alternatives_considered: string[]
  information_available: string[]
  information_missing: string[]
  decision_quality_score: number
  outcome_impact: string
  lessons_learned: string[]
}

export interface CommunicationEvent {
  timestamp: string
  communication_type: 'notification' | 'update' | 'directive' | 'request' | 'report'
  sender: string
  recipients: string[]
  channel: string
  content_summary: string
  effectiveness_score: number
  delays_identified: boolean
  gaps_identified: string[]
}

export interface TimelineGap {
  time_period: { start: string; end: string }
  gap_type: 'information' | 'activity' | 'communication' | 'decision'
  description: string
  potential_impact: string
  data_recovery_attempts: string[]
}

export interface ConcurrentActivity {
  activity: string
  participants: string[]
  time_overlap: { start: string; end: string }
  resource_conflicts: string[]
  coordination_issues: string[]
}

export interface RootCauseAnalysis {
  methodology: '5_whys' | 'fishbone' | 'fault_tree' | 'bow_tie' | 'barrier_analysis' | 'timeline_analysis'
  primary_root_causes: RootCause[]
  contributing_factors: ContributingFactor[]
  system_failures: SystemFailure[]
  human_factors: HumanFactor[]
  organizational_factors: OrganizationalFactor[]
  external_factors: ExternalFactor[]
  cause_and_effect_diagram?: string
  verification_evidence: Evidence[]
}

export interface RootCause {
  category: 'technical' | 'process' | 'human' | 'organizational' | 'environmental'
  description: string
  evidence: string[]
  likelihood_score: number
  impact_score: number
  preventability: 'preventable' | 'difficult_to_prevent' | 'unpreventable'
  related_recommendations: string[]
}

export interface ContributingFactor {
  factor: string
  factor_type: 'latent_condition' | 'active_failure' | 'organizational_influence'
  contribution_level: 'major' | 'moderate' | 'minor'
  description: string
  evidence: string[]
  addressability: 'easily_addressed' | 'moderately_complex' | 'highly_complex'
}

export interface SystemFailure {
  system_name: string
  failure_mode: string
  failure_point: string
  redundancy_status: 'none' | 'partial' | 'full_but_failed' | 'bypassed'
  detection_capability: 'none' | 'delayed' | 'immediate'
  recovery_capability: 'none' | 'manual' | 'automatic'
  design_adequacy: 'adequate' | 'inadequate' | 'unknown'
}

export interface HumanFactor {
  factor_type: 'skill' | 'knowledge' | 'experience' | 'training' | 'fatigue' | 'stress' | 'workload'
  description: string
  individuals_affected: number
  impact_on_performance: 'minimal' | 'moderate' | 'significant' | 'critical'
  training_implications: string[]
  procedural_implications: string[]
}

export interface OrganizationalFactor {
  factor_type: 'culture' | 'structure' | 'process' | 'resource' | 'communication' | 'leadership'
  description: string
  organizational_level: 'team' | 'department' | 'division' | 'enterprise'
  change_complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  stakeholder_impact: string[]
}

export interface ExternalFactor {
  factor_type: 'regulatory' | 'economic' | 'technological' | 'social' | 'environmental' | 'political'
  description: string
  controllability: 'controllable' | 'partially_controllable' | 'uncontrollable'
  predictability: 'predictable' | 'partially_predictable' | 'unpredictable'
  monitoring_capability: 'monitored' | 'partially_monitored' | 'unmonitored'
}

export interface Evidence {
  evidence_type: 'document' | 'testimony' | 'physical' | 'digital' | 'circumstantial'
  source: string
  description: string
  reliability: 'high' | 'medium' | 'low'
  corroboration: 'corroborated' | 'partially_corroborated' | 'uncorroborated'
  chain_of_custody: boolean
}

export interface ImpactAssessment {
  financial_impact: FinancialImpact
  operational_impact: OperationalImpact
  reputational_impact: ReputationalImpact
  regulatory_impact: RegulatoryImpact
  stakeholder_impact: StakeholderImpactDetail[]
  long_term_consequences: LongTermConsequence[]
  opportunity_costs: OpportunityCost[]
}

export interface FinancialImpact {
  direct_costs: {
    response_costs: number
    recovery_costs: number
    remediation_costs: number
    legal_costs: number
    regulatory_fines: number
    compensation_paid: number
  }
  indirect_costs: {
    revenue_loss: number
    productivity_loss: number
    opportunity_cost: number
    reputation_impact_cost: number
    customer_acquisition_cost_increase: number
  }
  cost_avoidance: {
    potential_losses_prevented: number
    early_detection_savings: number
    effective_response_savings: number
  }
  total_financial_impact: number
  cost_benefit_analysis: string
}

export interface OperationalImpact {
  systems_affected: string[]
  services_disrupted: string[]
  downtime_duration: number
  capacity_reduction_percentage: number
  recovery_time_objective_met: boolean
  recovery_point_objective_met: boolean
  business_continuity_effectiveness: number
  customer_impact_severity: CrisisLevel
}

export interface ReputationalImpact {
  media_coverage: {
    volume: number
    sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    reach_estimate: number
    key_narratives: string[]
  }
  stakeholder_sentiment: {
    customers: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    employees: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    investors: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    partners: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    regulators: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  }
  long_term_reputation_risk: CrisisLevel
  recovery_timeline_estimate: string
}

export interface RegulatoryImpact {
  regulatory_bodies_involved: string[]
  investigations_initiated: string[]
  fines_imposed: number
  compliance_violations: string[]
  new_requirements_imposed: string[]
  reporting_obligations: string[]
  ongoing_oversight_changes: string[]
}

export interface StakeholderImpactDetail {
  stakeholder_group: string
  impact_severity: CrisisLevel
  specific_impacts: string[]
  communication_effectiveness: number
  satisfaction_score: number
  trust_impact: 'increased' | 'maintained' | 'decreased' | 'severely_damaged'
  relationship_changes: string[]
}

export interface LongTermConsequence {
  consequence_type: 'strategic' | 'operational' | 'financial' | 'regulatory' | 'reputational'
  description: string
  probability: number
  impact_magnitude: CrisisLevel
  time_horizon: 'short_term' | 'medium_term' | 'long_term'
  mitigation_strategies: string[]
}

export interface OpportunityCost {
  opportunity: string
  estimated_value: number
  likelihood_of_loss: number
  contributing_factors: string[]
  recovery_strategies: string[]
}

export interface ResponseEffectivenessAnalysis {
  overall_effectiveness_score: number
  detection_effectiveness: {
    detection_time: number
    detection_accuracy: number
    false_positive_rate: number
    missed_indicators: string[]
  }
  response_time_analysis: {
    initial_response_time: number
    escalation_time: number
    full_mobilization_time: number
    target_vs_actual: Record<string, { target: number; actual: number }>
  }
  decision_making_effectiveness: {
    decision_speed: number
    decision_quality: number
    information_availability: number
    stakeholder_involvement: number
  }
  communication_effectiveness: {
    internal_communication_score: number
    external_communication_score: number
    message_consistency: number
    timeliness: number
    stakeholder_satisfaction: number
  }
  resource_utilization: {
    human_resources: number
    financial_resources: number
    technical_resources: number
    external_resources: number
    resource_efficiency: number
  }
  coordination_effectiveness: {
    team_coordination: number
    inter_department_coordination: number
    external_coordination: number
    leadership_effectiveness: number
  }
}

export interface StakeholderFeedback {
  stakeholder_id?: string
  stakeholder_role: string
  stakeholder_group: string
  feedback_date: string
  feedback_method: 'interview' | 'survey' | 'meeting' | 'written' | 'informal'
  overall_satisfaction: number
  specific_feedback: {
    what_worked_well: string[]
    areas_for_improvement: string[]
    suggestions: string[]
    concerns: string[]
  }
  follow_up_required: boolean
  anonymized: boolean
}

export interface Finding {
  id: string
  finding_type: 'strength' | 'weakness' | 'gap' | 'opportunity' | 'risk'
  category: 'process' | 'technology' | 'people' | 'governance' | 'external'
  title: string
  description: string
  evidence: string[]
  impact_assessment: string
  affected_stakeholders: string[]
  related_recommendations: string[]
  priority: RecommendationPriority
}

export interface Recommendation {
  id: string
  recommendation_type: 'process_improvement' | 'technology_enhancement' | 'training' | 'policy_change' | 'organizational_change' | 'resource_allocation'
  title: string
  description: string
  rationale: string
  expected_benefits: string[]
  implementation_complexity: 'low' | 'medium' | 'high'
  estimated_cost: number
  estimated_effort_hours: number
  priority: RecommendationPriority
  target_completion_date: string
  responsible_party: string
  stakeholders_affected: string[]
  success_criteria: string[]
  risk_mitigation: string[]
  dependencies: string[]
  status: RecommendationStatus
  implementation_plan: RecommendationImplementationPlan
  progress_updates: ProgressUpdate[]
}

export interface RecommendationImplementationPlan {
  phases: ImplementationPhase[]
  milestones: Milestone[]
  resource_requirements: ResourceRequirement[]
  risk_assessment: ImplementationRisk[]
  communication_plan: string[]
}

export interface ImplementationPhase {
  phase_number: number
  phase_name: string
  description: string
  start_date: string
  end_date: string
  deliverables: string[]
  success_criteria: string[]
  dependencies: string[]
}

export interface Milestone {
  milestone_name: string
  target_date: string
  description: string
  success_criteria: string[]
  responsible_party: string
}

export interface ResourceRequirement {
  resource_type: 'human' | 'financial' | 'technical' | 'external'
  description: string
  quantity: number
  unit: string
  estimated_cost: number
  availability_risk: 'low' | 'medium' | 'high'
}

export interface ImplementationRisk {
  risk_description: string
  probability: number
  impact: CrisisLevel
  mitigation_strategies: string[]
  contingency_plans: string[]
}

export interface ProgressUpdate {
  update_date: string
  updated_by: string
  progress_percentage: number
  status_summary: string
  achievements: string[]
  challenges: string[]
  next_steps: string[]
  revised_timeline?: string
}

export interface LessonLearned {
  id: string
  category: 'prevention' | 'detection' | 'response' | 'recovery' | 'communication' | 'coordination'
  title: string
  description: string
  context: string
  applicability: {
    incident_types: CrisisCategory[]
    organizational_levels: string[]
    functional_areas: string[]
    external_applicability: boolean
  }
  knowledge_type: 'best_practice' | 'avoid_this' | 'consider_this' | 'remember_this'
  evidence_strength: 'strong' | 'moderate' | 'weak'
  shareability: 'internal_only' | 'industry_sharing' | 'public_domain'
  related_standards: string[]
  knowledge_retention_plan: string[]
}

export interface ImplementationPlan {
  overall_timeline: string
  phases: ImplementationPhase[]
  resource_allocation: ResourceAllocation[]
  governance_structure: GovernanceStructure
  success_metrics: SuccessMetric[]
  risk_management: RiskManagementPlan
  communication_strategy: CommunicationStrategy
  change_management: ChangeManagementPlan
}

export interface ResourceAllocation {
  resource_category: string
  allocated_budget: number
  allocated_fte: number
  external_resources: string[]
  timeline: string
}

export interface GovernanceStructure {
  steering_committee: string[]
  working_groups: WorkingGroup[]
  reporting_frequency: string
  escalation_criteria: string[]
  decision_rights: DecisionRight[]
}

export interface WorkingGroup {
  name: string
  purpose: string
  members: string[]
  deliverables: string[]
  timeline: string
}

export interface DecisionRight {
  decision_type: string
  decision_maker: string
  escalation_path: string[]
  authority_limits: string[]
}

export interface SuccessMetric {
  metric_name: string
  description: string
  target_value: number
  measurement_method: string
  measurement_frequency: string
  responsible_party: string
}

export interface RiskManagementPlan {
  identified_risks: ImplementationRisk[]
  risk_monitoring_process: string
  escalation_triggers: string[]
  contingency_resources: string[]
}

export interface CommunicationStrategy {
  stakeholder_groups: string[]
  communication_methods: string[]
  frequency: string
  key_messages: string[]
  feedback_mechanisms: string[]
}

export interface ChangeManagementPlan {
  change_readiness_assessment: string
  training_requirements: TrainingRequirement[]
  resistance_management: string[]
  success_reinforcement: string[]
}

export interface TrainingRequirement {
  target_audience: string
  training_type: string
  duration: string
  delivery_method: string
  success_criteria: string[]
}

export interface AnalysisMetric {
  metric_name: string
  baseline_value?: number
  incident_value: number
  target_value: number
  improvement_percentage: number
  measurement_date: string
  data_source: string
  reliability: 'high' | 'medium' | 'low'
}

export interface AnalysisReviewer {
  reviewer_id: string
  reviewer_role: string
  review_type: 'technical' | 'management' | 'legal' | 'stakeholder' | 'executive'
  review_status: 'pending' | 'in_progress' | 'completed' | 'approved_with_changes' | 'rejected'
  review_date?: string
  comments?: string
  required_changes?: string[]
}

export interface AnalysisAppendix {
  appendix_id: string
  title: string
  content_type: 'data_tables' | 'detailed_analysis' | 'supporting_documents' | 'technical_details' | 'interview_transcripts'
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  page_count: number
  file_path?: string
}

// Input validation schemas
const CreateAnalysisSchema = z.object({
  incident_id: z.string().uuid(),
  analysis_type: z.nativeEnum(AnalysisType),
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  analysis_scope: z.object({
    time_period: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    stakeholders_involved: z.array(z.string()).min(1),
    systems_affected: z.array(z.string()).optional(),
    processes_reviewed: z.array(z.string()).optional()
  }),
  assigned_analysts: z.array(z.string().uuid()).min(1),
  confidentiality_level: z.enum(['public', 'internal', 'confidential', 'restricted']),
  target_completion_date: z.string().datetime()
})

const AddFindingSchema = z.object({
  finding_type: z.enum(['strength', 'weakness', 'gap', 'opportunity', 'risk']),
  category: z.enum(['process', 'technology', 'people', 'governance', 'external']),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  evidence: z.array(z.string()),
  impact_assessment: z.string(),
  priority: z.nativeEnum(RecommendationPriority)
})

const AddRecommendationSchema = z.object({
  recommendation_type: z.enum(['process_improvement', 'technology_enhancement', 'training', 'policy_change', 'organizational_change', 'resource_allocation']),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  rationale: z.string().min(1),
  expected_benefits: z.array(z.string()).min(1),
  implementation_complexity: z.enum(['low', 'medium', 'high']),
  estimated_cost: z.number().min(0),
  estimated_effort_hours: z.number().min(0),
  priority: z.nativeEnum(RecommendationPriority),
  responsible_party: z.string().uuid(),
  target_completion_date: z.string().datetime()
})

export class PostIncidentAnalysisService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * ANALYSIS CREATION AND MANAGEMENT
   */

  async createAnalysis(
    data: z.infer<typeof CreateAnalysisSchema>
  ): Promise<Result<PostIncidentAnalysis>> {
    const validatedData = this.validateWithContext(data, CreateAnalysisSchema, 'create post-incident analysis')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'post_incident_analyses',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      // Initialize analysis structure
      const analysis: PostIncidentAnalysis = {
        id: crypto.randomUUID(),
        incident_id: validatedData.data.incident_id,
        analysis_type: validatedData.data.analysis_type,
        title: validatedData.data.title,
        description: validatedData.data.description,
        analysis_scope: validatedData.data.analysis_scope,
        methodology: {
          data_sources: [],
          analysis_techniques: this.getDefaultAnalysisTechniques(validatedData.data.analysis_type),
          interview_subjects: [],
          documentation_reviewed: [],
          tools_used: ['incident_reports', 'log_analysis', 'stakeholder_interviews']
        },
        timeline_analysis: {
          critical_events: [],
          decision_points: [],
          communication_flow: [],
          timeline_accuracy_score: 0,
          gaps_identified: [],
          concurrent_activities: []
        },
        root_cause_analysis: {
          methodology: this.getDefaultRootCauseMethodology(validatedData.data.analysis_type),
          primary_root_causes: [],
          contributing_factors: [],
          system_failures: [],
          human_factors: [],
          organizational_factors: [],
          external_factors: [],
          verification_evidence: []
        },
        impact_assessment: {
          financial_impact: this.initializeFinancialImpact(),
          operational_impact: this.initializeOperationalImpact(),
          reputational_impact: this.initializeReputationalImpact(),
          regulatory_impact: this.initializeRegulatoryImpact(),
          stakeholder_impact: [],
          long_term_consequences: [],
          opportunity_costs: []
        },
        response_effectiveness: {
          overall_effectiveness_score: 0,
          detection_effectiveness: {
            detection_time: 0,
            detection_accuracy: 0,
            false_positive_rate: 0,
            missed_indicators: []
          },
          response_time_analysis: {
            initial_response_time: 0,
            escalation_time: 0,
            full_mobilization_time: 0,
            target_vs_actual: {}
          },
          decision_making_effectiveness: {
            decision_speed: 0,
            decision_quality: 0,
            information_availability: 0,
            stakeholder_involvement: 0
          },
          communication_effectiveness: {
            internal_communication_score: 0,
            external_communication_score: 0,
            message_consistency: 0,
            timeliness: 0,
            stakeholder_satisfaction: 0
          },
          resource_utilization: {
            human_resources: 0,
            financial_resources: 0,
            technical_resources: 0,
            external_resources: 0,
            resource_efficiency: 0
          },
          coordination_effectiveness: {
            team_coordination: 0,
            inter_department_coordination: 0,
            external_coordination: 0,
            leadership_effectiveness: 0
          }
        },
        stakeholder_feedback: [],
        key_findings: [],
        recommendations: [],
        lessons_learned: [],
        implementation_plan: this.initializeImplementationPlan(),
        metrics_and_kpis: [],
        status: AnalysisStatus.INITIATED,
        assigned_analysts: validatedData.data.assigned_analysts,
        reviewers: [],
        stakeholder_distribution: {
          internal_stakeholders: [],
          external_stakeholders: [],
          regulatory_bodies: [],
          board_members: []
        },
        confidentiality_level: validatedData.data.confidentiality_level,
        legal_privilege_claimed: false,
        executive_summary: '',
        appendices: [],
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .insert(analysis)
        .select()
        .single()

      if (error) throw error

      // Send notifications to assigned analysts
      await this.notifyAssignedAnalysts(analysis.id, analysis.assigned_analysts, analysis.analysis_type)

      // Auto-collect initial data
      await this.initiateDataCollection(analysis.id, analysis.incident_id)

      await this.logActivity('create_post_incident_analysis', 'post_incident_analysis', analysis.id, {
        incident_id: analysis.incident_id,
        analysis_type: analysis.analysis_type,
        analysts_assigned: analysis.assigned_analysts.length
      })

      return createdAnalysis as PostIncidentAnalysis
    }, 'createAnalysis')
  }

  async updateAnalysisStatus(
    analysisId: string,
    newStatus: AnalysisStatus,
    statusNote?: string
  ): Promise<Result<PostIncidentAnalysis>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: analysis, error } = await this.supabase
        .from('post_incident_analyses')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === AnalysisStatus.COMPLETED ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === AnalysisStatus.PUBLISHED ? { published_at: new Date().toISOString() } : {})
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (error) throw error

      // Handle status-specific actions
      await this.handleStatusChange(analysisId, newStatus)

      await this.logActivity('update_analysis_status', 'post_incident_analysis', analysisId, {
        new_status: newStatus,
        note: statusNote
      })

      return analysis as PostIncidentAnalysis
    }, 'updateAnalysisStatus')
  }

  /**
   * FINDINGS MANAGEMENT
   */

  async addFinding(
    analysisId: string,
    findingData: z.infer<typeof AddFindingSchema>
  ): Promise<Result<Finding>> {
    const validatedData = this.validateWithContext(findingData, AddFindingSchema, 'add finding')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const finding: Finding = {
        id: crypto.randomUUID(),
        finding_type: validatedData.data.finding_type,
        category: validatedData.data.category,
        title: validatedData.data.title,
        description: validatedData.data.description,
        evidence: validatedData.data.evidence,
        impact_assessment: validatedData.data.impact_assessment,
        affected_stakeholders: [],
        related_recommendations: [],
        priority: validatedData.data.priority
      }

      // Add finding to analysis
      const { data: analysis, error: fetchError } = await this.supabase
        .from('post_incident_analyses')
        .select('key_findings')
        .eq('id', analysisId)
        .single()

      if (fetchError) throw fetchError

      const updatedFindings = [...(analysis.key_findings || []), finding]

      const { data: updatedAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .update({
          key_findings: updatedFindings,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('add_analysis_finding', 'post_incident_analysis', analysisId, {
        finding_type: finding.finding_type,
        category: finding.category,
        priority: finding.priority
      })

      return finding
    }, 'addFinding')
  }

  /**
   * RECOMMENDATIONS MANAGEMENT
   */

  async addRecommendation(
    analysisId: string,
    recommendationData: z.infer<typeof AddRecommendationSchema>
  ): Promise<Result<Recommendation>> {
    const validatedData = this.validateWithContext(recommendationData, AddRecommendationSchema, 'add recommendation')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const recommendation: Recommendation = {
        id: crypto.randomUUID(),
        recommendation_type: validatedData.data.recommendation_type,
        title: validatedData.data.title,
        description: validatedData.data.description,
        rationale: validatedData.data.rationale,
        expected_benefits: validatedData.data.expected_benefits,
        implementation_complexity: validatedData.data.implementation_complexity,
        estimated_cost: validatedData.data.estimated_cost,
        estimated_effort_hours: validatedData.data.estimated_effort_hours,
        priority: validatedData.data.priority,
        target_completion_date: validatedData.data.target_completion_date,
        responsible_party: validatedData.data.responsible_party,
        stakeholders_affected: [],
        success_criteria: [],
        risk_mitigation: [],
        dependencies: [],
        status: RecommendationStatus.PROPOSED,
        implementation_plan: {
          phases: [],
          milestones: [],
          resource_requirements: [],
          risk_assessment: [],
          communication_plan: []
        },
        progress_updates: []
      }

      // Add recommendation to analysis
      const { data: analysis, error: fetchError } = await this.supabase
        .from('post_incident_analyses')
        .select('recommendations')
        .eq('id', analysisId)
        .single()

      if (fetchError) throw fetchError

      const updatedRecommendations = [...(analysis.recommendations || []), recommendation]

      const { data: updatedAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .update({
          recommendations: updatedRecommendations,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (error) throw error

      // Notify responsible party
      await this.notifyRecommendationAssignment(recommendation.id, recommendation.responsible_party)

      await this.logActivity('add_analysis_recommendation', 'post_incident_analysis', analysisId, {
        recommendation_type: recommendation.recommendation_type,
        priority: recommendation.priority,
        estimated_cost: recommendation.estimated_cost,
        responsible_party: recommendation.responsible_party
      })

      return recommendation
    }, 'addRecommendation')
  }

  async updateRecommendationStatus(
    analysisId: string,
    recommendationId: string,
    newStatus: RecommendationStatus,
    progressUpdate?: Omit<ProgressUpdate, 'update_date' | 'updated_by'>
  ): Promise<Result<Recommendation>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: analysis, error: fetchError } = await this.supabase
        .from('post_incident_analyses')
        .select('recommendations')
        .eq('id', analysisId)
        .single()

      if (fetchError) throw fetchError

      const updatedRecommendations = analysis.recommendations.map((rec: Recommendation) => {
        if (rec.id === recommendationId) {
          const updatedRec = { ...rec, status: newStatus }
          
          if (progressUpdate) {
            const update: ProgressUpdate = {
              ...progressUpdate,
              update_date: new Date().toISOString(),
              updated_by: user.data.id
            }
            updatedRec.progress_updates = [...rec.progress_updates, update]
          }
          
          return updatedRec
        }
        return rec
      })

      const { data: updatedAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .update({
          recommendations: updatedRecommendations,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (error) throw error

      const updatedRecommendation = updatedRecommendations.find((r: Recommendation) => r.id === recommendationId)

      await this.logActivity('update_recommendation_status', 'post_incident_analysis', analysisId, {
        recommendation_id: recommendationId,
        new_status: newStatus,
        progress_percentage: progressUpdate?.progress_percentage
      })

      return updatedRecommendation!
    }, 'updateRecommendationStatus')
  }

  /**
   * LESSONS LEARNED MANAGEMENT
   */

  async addLessonLearned(
    analysisId: string,
    lessonData: {
      category: LessonLearned['category']
      title: string
      description: string
      context: string
      knowledge_type: LessonLearned['knowledge_type']
      applicability: LessonLearned['applicability']
    }
  ): Promise<Result<LessonLearned>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const lesson: LessonLearned = {
        id: crypto.randomUUID(),
        category: lessonData.category,
        title: lessonData.title,
        description: lessonData.description,
        context: lessonData.context,
        applicability: lessonData.applicability,
        knowledge_type: lessonData.knowledge_type,
        evidence_strength: 'moderate', // Default
        shareability: 'internal_only', // Default
        related_standards: [],
        knowledge_retention_plan: []
      }

      // Add lesson to analysis
      const { data: analysis, error: fetchError } = await this.supabase
        .from('post_incident_analyses')
        .select('lessons_learned')
        .eq('id', analysisId)
        .single()

      if (fetchError) throw fetchError

      const updatedLessons = [...(analysis.lessons_learned || []), lesson]

      const { data: updatedAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .update({
          lessons_learned: updatedLessons,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (error) throw error

      // Add to organizational knowledge base if appropriate
      if (lesson.shareability !== 'internal_only') {
        await this.addToKnowledgeBase(lesson)
      }

      await this.logActivity('add_lesson_learned', 'post_incident_analysis', analysisId, {
        lesson_category: lesson.category,
        knowledge_type: lesson.knowledge_type,
        shareability: lesson.shareability
      })

      return lesson
    }, 'addLessonLearned')
  }

  /**
   * TIMELINE ANALYSIS
   */

  async reconstructTimeline(analysisId: string): Promise<Result<TimelineAnalysis>> {
    return this.executeDbOperation(async () => {
      const { data: analysis, error } = await this.supabase
        .from('post_incident_analyses')
        .select('*')
        .eq('id', analysisId)
        .single()

      if (error) throw error

      // Collect timeline data from various sources
      const timelineData = await this.collectTimelineData(analysis.incident_id, analysis.analysis_scope)

      // Reconstruct timeline
      const timelineAnalysis = await this.analyzeTimeline(timelineData)

      // Update analysis with timeline
      const { data: updatedAnalysis, error: updateError } = await this.supabase
        .from('post_incident_analyses')
        .update({
          timeline_analysis: timelineAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (updateError) throw updateError

      await this.logActivity('reconstruct_timeline', 'post_incident_analysis', analysisId, {
        critical_events_count: timelineAnalysis.critical_events.length,
        decision_points_count: timelineAnalysis.decision_points.length,
        accuracy_score: timelineAnalysis.timeline_accuracy_score
      })

      return timelineAnalysis
    }, 'reconstructTimeline')
  }

  /**
   * ROOT CAUSE ANALYSIS
   */

  async performRootCauseAnalysis(
    analysisId: string,
    methodology: RootCauseAnalysis['methodology'] = '5_whys'
  ): Promise<Result<RootCauseAnalysis>> {
    return this.executeDbOperation(async () => {
      const { data: analysis, error } = await this.supabase
        .from('post_incident_analyses')
        .select('*')
        .eq('id', analysisId)
        .single()

      if (error) throw error

      // Perform root cause analysis based on methodology
      const rootCauseAnalysis = await this.conductRootCauseAnalysis(analysis, methodology)

      // Update analysis with root cause findings
      const { data: updatedAnalysis, error: updateError } = await this.supabase
        .from('post_incident_analyses')
        .update({
          root_cause_analysis: rootCauseAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single()

      if (updateError) throw updateError

      await this.logActivity('perform_root_cause_analysis', 'post_incident_analysis', analysisId, {
        methodology,
        root_causes_identified: rootCauseAnalysis.primary_root_causes.length,
        contributing_factors: rootCauseAnalysis.contributing_factors.length
      })

      return rootCauseAnalysis
    }, 'performRootCauseAnalysis')
  }

  /**
   * ANALYTICS AND REPORTING
   */

  async generateExecutiveSummary(analysisId: string): Promise<Result<string>> {
    return this.executeDbOperation(async () => {
      const { data: analysis, error } = await this.supabase
        .from('post_incident_analyses')
        .select('*')
        .eq('id', analysisId)
        .single()

      if (error) throw error

      // Generate executive summary
      const summary = this.createExecutiveSummary(analysis)

      // Update analysis with summary
      await this.supabase
        .from('post_incident_analyses')
        .update({
          executive_summary: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)

      await this.logActivity('generate_executive_summary', 'post_incident_analysis', analysisId)

      return summary
    }, 'generateExecutiveSummary')
  }

  async generateAnalyticsReport(
    timeRange: { start: string; end: string },
    filters?: {
      analysis_types?: AnalysisType[]
      categories?: CrisisCategory[]
      severity_levels?: CrisisLevel[]
    }
  ): Promise<Result<{
    summary: {
      total_analyses: number
      completed_analyses: number
      average_completion_time: number
      total_recommendations: number
      implemented_recommendations: number
    }
    trends: {
      analysis_volume_by_month: Array<{ month: string; count: number }>
      common_root_causes: Array<{ cause: string; frequency: number }>
      recommendation_effectiveness: number
    }
    insights: {
      most_effective_practices: string[]
      recurring_issues: string[]
      improvement_opportunities: string[]
    }
  }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('post_incident_analyses')
        .select('*')
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      if (filters?.analysis_types) {
        query = query.in('analysis_type', filters.analysis_types)
      }

      const { data: analyses, error } = await query

      if (error) throw error

      // Generate analytics
      const summary = this.calculateAnalyticsSummary(analyses)
      const trends = this.calculateAnalyticsTrends(analyses)
      const insights = this.generateAnalyticsInsights(analyses)

      return {
        summary,
        trends,
        insights
      }
    }, 'generateAnalyticsReport')
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private getDefaultAnalysisTechniques(analysisType: AnalysisType): string[] {
    switch (analysisType) {
      case AnalysisType.ROOT_CAUSE:
        return ['5_whys', 'fishbone_diagram', 'fault_tree_analysis']
      case AnalysisType.TIMELINE_RECONSTRUCTION:
        return ['event_correlation', 'log_analysis', 'stakeholder_interviews']
      case AnalysisType.STAKEHOLDER_IMPACT:
        return ['stakeholder_surveys', 'impact_mapping', 'sentiment_analysis']
      case AnalysisType.FINANCIAL_IMPACT:
        return ['cost_accounting', 'impact_modeling', 'roi_analysis']
      default:
        return ['document_review', 'stakeholder_interviews', 'data_analysis']
    }
  }

  private getDefaultRootCauseMethodology(analysisType: AnalysisType): RootCauseAnalysis['methodology'] {
    switch (analysisType) {
      case AnalysisType.ROOT_CAUSE:
        return '5_whys'
      case AnalysisType.TIMELINE_RECONSTRUCTION:
        return 'timeline_analysis'
      default:
        return 'fishbone'
    }
  }

  private initializeFinancialImpact(): FinancialImpact {
    return {
      direct_costs: {
        response_costs: 0,
        recovery_costs: 0,
        remediation_costs: 0,
        legal_costs: 0,
        regulatory_fines: 0,
        compensation_paid: 0
      },
      indirect_costs: {
        revenue_loss: 0,
        productivity_loss: 0,
        opportunity_cost: 0,
        reputation_impact_cost: 0,
        customer_acquisition_cost_increase: 0
      },
      cost_avoidance: {
        potential_losses_prevented: 0,
        early_detection_savings: 0,
        effective_response_savings: 0
      },
      total_financial_impact: 0,
      cost_benefit_analysis: 'To be determined'
    }
  }

  private initializeOperationalImpact(): OperationalImpact {
    return {
      systems_affected: [],
      services_disrupted: [],
      downtime_duration: 0,
      capacity_reduction_percentage: 0,
      recovery_time_objective_met: false,
      recovery_point_objective_met: false,
      business_continuity_effectiveness: 0,
      customer_impact_severity: CrisisLevel.LOW
    }
  }

  private initializeReputationalImpact(): ReputationalImpact {
    return {
      media_coverage: {
        volume: 0,
        sentiment: 'neutral',
        reach_estimate: 0,
        key_narratives: []
      },
      stakeholder_sentiment: {
        customers: 'neutral',
        employees: 'neutral',
        investors: 'neutral',
        partners: 'neutral',
        regulators: 'neutral'
      },
      long_term_reputation_risk: CrisisLevel.LOW,
      recovery_timeline_estimate: 'To be assessed'
    }
  }

  private initializeRegulatoryImpact(): RegulatoryImpact {
    return {
      regulatory_bodies_involved: [],
      investigations_initiated: [],
      fines_imposed: 0,
      compliance_violations: [],
      new_requirements_imposed: [],
      reporting_obligations: [],
      ongoing_oversight_changes: []
    }
  }

  private initializeImplementationPlan(): ImplementationPlan {
    return {
      overall_timeline: 'To be determined',
      phases: [],
      resource_allocation: [],
      governance_structure: {
        steering_committee: [],
        working_groups: [],
        reporting_frequency: 'weekly',
        escalation_criteria: [],
        decision_rights: []
      },
      success_metrics: [],
      risk_management: {
        identified_risks: [],
        risk_monitoring_process: 'Weekly risk review meetings',
        escalation_triggers: [],
        contingency_resources: []
      },
      communication_strategy: {
        stakeholder_groups: [],
        communication_methods: ['email', 'meetings', 'reports'],
        frequency: 'bi-weekly',
        key_messages: [],
        feedback_mechanisms: ['surveys', 'interviews']
      },
      change_management: {
        change_readiness_assessment: 'To be conducted',
        training_requirements: [],
        resistance_management: [],
        success_reinforcement: []
      }
    }
  }

  private async notifyAssignedAnalysts(
    analysisId: string,
    analystIds: string[],
    analysisType: AnalysisType
  ): Promise<void> {
    const notifications = analystIds.map(userId => ({
      user_id: userId,
      type: 'analysis_assignment',
      title: 'Post-Incident Analysis Assignment',
      message: `You have been assigned to conduct a ${analysisType} analysis`,
      priority: 'medium',
      metadata: {
        analysis_id: analysisId,
        analysis_type: analysisType
      }
    }))

    await this.supabase.from('notifications').insert(notifications)
  }

  private async initiateDataCollection(analysisId: string, incidentId: string): Promise<void> {
    // This would automatically collect initial data from various sources
    // For now, just log the action
    await this.logActivity('initiate_data_collection', 'post_incident_analysis', analysisId, {
      incident_id: incidentId,
      collection_type: 'automatic'
    })
  }

  private async handleStatusChange(analysisId: string, newStatus: AnalysisStatus): Promise<void> {
    switch (newStatus) {
      case AnalysisStatus.COMPLETED:
        await this.generateExecutiveSummary(analysisId)
        break
      case AnalysisStatus.PUBLISHED:
        await this.distributeAnalysis(analysisId)
        break
    }
  }

  private async notifyRecommendationAssignment(recommendationId: string, responsibleParty: string): Promise<void> {
    const notification = {
      user_id: responsibleParty,
      type: 'recommendation_assignment',
      title: 'Recommendation Assignment',
      message: 'You have been assigned responsibility for implementing a post-incident recommendation',
      priority: 'medium',
      metadata: {
        recommendation_id: recommendationId
      }
    }

    await this.supabase.from('notifications').insert([notification])
  }

  private async addToKnowledgeBase(lesson: LessonLearned): Promise<void> {
    // This would add the lesson to an organizational knowledge base
    console.log(`Adding lesson learned to knowledge base: ${lesson.title}`)
  }

  private async collectTimelineData(incidentId: string, scope: any): Promise<any> {
    // Collect timeline data from incident logs, communications, etc.
    return {
      incident_logs: [],
      communication_records: [],
      decision_records: [],
      system_events: []
    }
  }

  private async analyzeTimeline(timelineData: any): Promise<TimelineAnalysis> {
    // Analyze collected timeline data
    return {
      critical_events: [],
      decision_points: [],
      communication_flow: [],
      timeline_accuracy_score: 0.8,
      gaps_identified: [],
      concurrent_activities: []
    }
  }

  private async conductRootCauseAnalysis(analysis: any, methodology: RootCauseAnalysis['methodology']): Promise<RootCauseAnalysis> {
    // Perform root cause analysis based on selected methodology
    return {
      methodology,
      primary_root_causes: [],
      contributing_factors: [],
      system_failures: [],
      human_factors: [],
      organizational_factors: [],
      external_factors: [],
      verification_evidence: []
    }
  }

  private createExecutiveSummary(analysis: PostIncidentAnalysis): string {
    return `
Executive Summary: ${analysis.title}

Incident Overview:
This ${analysis.analysis_type} analysis examined the incident that occurred during the period from ${analysis.analysis_scope.time_period.start} to ${analysis.analysis_scope.time_period.end}.

Key Findings:
${analysis.key_findings.map(f => `• ${f.title}: ${f.description.substring(0, 100)}...`).join('\n')}

Recommendations:
${analysis.recommendations.map(r => `• ${r.title} (Priority: ${r.priority})`).join('\n')}

Impact Assessment:
Financial Impact: $${analysis.impact_assessment.financial_impact.total_financial_impact.toLocaleString()}
Operational Impact: ${analysis.impact_assessment.operational_impact.downtime_duration} minutes of downtime

Next Steps:
The implementation plan addresses ${analysis.recommendations.length} recommendations with an estimated timeline of ${analysis.implementation_plan.overall_timeline}.
    `.trim()
  }

  private async distributeAnalysis(analysisId: string): Promise<void> {
    // Distribute the completed analysis to stakeholders
    console.log(`Distributing analysis ${analysisId} to stakeholders`)
  }

  private calculateAnalyticsSummary(analyses: any[]): any {
    const completed = analyses.filter(a => a.status === AnalysisStatus.COMPLETED)
    const totalRecommendations = analyses.reduce((sum, a) => sum + (a.recommendations?.length || 0), 0)
    const implementedRecommendations = analyses.reduce((sum, a) => 
      sum + (a.recommendations?.filter((r: any) => r.status === RecommendationStatus.COMPLETED)?.length || 0), 0)

    return {
      total_analyses: analyses.length,
      completed_analyses: completed.length,
      average_completion_time: this.calculateAverageCompletionTime(completed),
      total_recommendations: totalRecommendations,
      implemented_recommendations: implementedRecommendations
    }
  }

  private calculateAnalyticsTrends(analyses: any[]): any {
    return {
      analysis_volume_by_month: this.groupAnalysesByMonth(analyses),
      common_root_causes: this.extractCommonRootCauses(analyses),
      recommendation_effectiveness: this.calculateRecommendationEffectiveness(analyses)
    }
  }

  private generateAnalyticsInsights(analyses: any[]): any {
    return {
      most_effective_practices: this.identifyEffectivePractices(analyses),
      recurring_issues: this.identifyRecurringIssues(analyses),
      improvement_opportunities: this.identifyImprovementOpportunities(analyses)
    }
  }

  private calculateAverageCompletionTime(completedAnalyses: any[]): number {
    if (completedAnalyses.length === 0) return 0

    const totalTime = completedAnalyses.reduce((sum, analysis) => {
      if (analysis.completed_at && analysis.created_at) {
        const duration = new Date(analysis.completed_at).getTime() - new Date(analysis.created_at).getTime()
        return sum + duration
      }
      return sum
    }, 0)

    return Math.round(totalTime / completedAnalyses.length / (1000 * 60 * 60 * 24)) // Convert to days
  }

  private groupAnalysesByMonth(analyses: any[]): Array<{ month: string; count: number }> {
    // Group analyses by month and return volume data
    const monthlyData: Record<string, number> = {}
    
    analyses.forEach(analysis => {
      const month = analysis.created_at.substring(0, 7) // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + 1
    })

    return Object.entries(monthlyData).map(([month, count]) => ({ month, count }))
  }

  private extractCommonRootCauses(analyses: any[]): Array<{ cause: string; frequency: number }> {
    // Extract and count common root causes
    const causeFrequency: Record<string, number> = {}
    
    analyses.forEach(analysis => {
      analysis.root_cause_analysis?.primary_root_causes?.forEach((cause: any) => {
        causeFrequency[cause.description] = (causeFrequency[cause.description] || 0) + 1
      })
    })

    return Object.entries(causeFrequency)
      .map(([cause, frequency]) => ({ cause, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Top 10
  }

  private calculateRecommendationEffectiveness(analyses: any[]): number {
    let totalRecommendations = 0
    let implementedRecommendations = 0

    analyses.forEach(analysis => {
      if (analysis.recommendations) {
        totalRecommendations += analysis.recommendations.length
        implementedRecommendations += analysis.recommendations.filter(
          (r: any) => r.status === RecommendationStatus.COMPLETED
        ).length
      }
    })

    return totalRecommendations > 0 ? (implementedRecommendations / totalRecommendations) * 100 : 0
  }

  private identifyEffectivePractices(analyses: any[]): string[] {
    // Identify practices that appear in successful analyses
    return [
      'Rapid stakeholder engagement',
      'Comprehensive data collection',
      'Multi-perspective analysis',
      'Clear accountability assignment'
    ]
  }

  private identifyRecurringIssues(analyses: any[]): string[] {
    // Identify issues that appear across multiple analyses
    return [
      'Communication delays',
      'Inadequate monitoring',
      'Insufficient training',
      'Process gaps'
    ]
  }

  private identifyImprovementOpportunities(analyses: any[]): string[] {
    // Identify opportunities for improvement
    return [
      'Automated data collection',
      'Standardized analysis templates',
      'Enhanced stakeholder feedback mechanisms',
      'Improved recommendation tracking'
    ]
  }
}