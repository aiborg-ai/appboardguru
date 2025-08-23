import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'
import { CrisisLevel, CrisisCategory } from './crisis-management.service'

export enum ScenarioType {
  TABLETOP_EXERCISE = 'tabletop_exercise',
  FUNCTIONAL_EXERCISE = 'functional_exercise',
  FULL_SCALE_EXERCISE = 'full_scale_exercise',
  WALKTHROUGH = 'walkthrough',
  SIMULATION = 'simulation',
  STRESS_TEST = 'stress_test'
}

export enum PreparednessLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum ExerciseStatus {
  PLANNING = 'planning',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  UNDER_REVIEW = 'under_review'
}

export enum TrainingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  OVERDUE = 'overdue'
}

export interface CrisisScenario {
  id: string
  name: string
  description: string
  category: CrisisCategory
  severity: CrisisLevel
  scenario_type: ScenarioType
  complexity_level: PreparednessLevel
  estimated_duration_hours: number
  participant_roles: string[]
  learning_objectives: LearningObjective[]
  scenario_narrative: ScenarioNarrative
  injects: ScenarioInject[]
  decision_points: ScenarioDecisionPoint[]
  evaluation_criteria: EvaluationCriterion[]
  resources_required: ResourceRequirement[]
  prerequisites: string[]
  success_metrics: SuccessMetric[]
  tags: string[]
  industry_specific: boolean
  regulatory_compliance: string[]
  created_by: string
  created_at: string
  updated_at: string
  last_used?: string
  usage_count: number
  effectiveness_rating: number
  is_active: boolean
}

export interface LearningObjective {
  id: string
  objective: string
  skill_area: 'decision_making' | 'communication' | 'coordination' | 'technical' | 'leadership' | 'compliance'
  proficiency_level: 'awareness' | 'basic' | 'intermediate' | 'advanced' | 'expert'
  measurable_outcome: string
  assessment_method: string
}

export interface ScenarioNarrative {
  background: string
  timeline: NarrativeEvent[]
  context_setting: {
    location: string
    time_of_day: string
    day_of_week: string
    season: string
    external_conditions: string[]
    organizational_state: string
  }
  initial_conditions: string[]
  escalation_factors: string[]
  complicating_factors: string[]
  resolution_paths: string[]
}

export interface NarrativeEvent {
  time_offset_minutes: number
  event_title: string
  event_description: string
  event_type: 'information' | 'action_required' | 'decision_point' | 'complication' | 'escalation'
  affected_systems: string[]
  stakeholders_involved: string[]
  urgency_level: CrisisLevel
  information_available: string[]
  information_missing: string[]
}

export interface ScenarioInject {
  id: string
  inject_title: string
  inject_description: string
  timing: {
    trigger_type: 'time_based' | 'event_based' | 'decision_based' | 'performance_based'
    trigger_condition: string
    delay_minutes?: number
  }
  inject_type: 'information' | 'media_report' | 'stakeholder_contact' | 'system_alert' | 'external_pressure' | 'resource_constraint'
  delivery_method: 'verbal' | 'written' | 'phone_call' | 'email' | 'system_notification' | 'media_simulation'
  target_roles: string[]
  content: {
    message: string
    attachments?: string[]
    urgency_indicators: string[]
    response_expected: boolean
    response_timeline_minutes?: number
  }
  expected_actions: string[]
  evaluation_points: string[]
  complexity_modifier: number
}

export interface ScenarioDecisionPoint {
  id: string
  decision_title: string
  decision_context: string
  timing: {
    earliest_minutes: number
    latest_minutes: number
    optimal_window_minutes: number
  }
  decision_maker_roles: string[]
  information_available: string[]
  information_needed: string[]
  options: DecisionOption[]
  consequences: DecisionConsequence[]
  evaluation_criteria: string[]
  time_pressure_factor: number
}

export interface DecisionOption {
  option_id: string
  option_title: string
  option_description: string
  resource_requirements: string[]
  implementation_time: number
  risk_level: CrisisLevel
  success_probability: number
  side_effects: string[]
}

export interface DecisionConsequence {
  option_id: string
  immediate_consequences: string[]
  short_term_consequences: string[]
  long_term_consequences: string[]
  stakeholder_reactions: Record<string, string>
  resource_impacts: string[]
  reputation_impact: CrisisLevel
  financial_impact: number
}

export interface EvaluationCriterion {
  id: string
  criterion_name: string
  criterion_description: string
  weight: number
  measurement_method: 'observation' | 'timing' | 'quality_assessment' | 'stakeholder_feedback' | 'outcome_measurement'
  scale_type: 'binary' | 'numeric' | 'qualitative' | 'percentage'
  scale_definition: any
  evaluator_roles: string[]
  evaluation_timing: 'real_time' | 'post_inject' | 'post_exercise'
}

export interface ResourceRequirement {
  resource_type: 'human' | 'technical' | 'facility' | 'external' | 'information'
  resource_name: string
  quantity: number
  duration_hours: number
  availability_requirement: 'dedicated' | 'on_call' | 'scheduled' | 'external_coordination'
  specialized_skills?: string[]
  backup_options: string[]
}

export interface SuccessMetric {
  metric_name: string
  metric_description: string
  target_value: number
  measurement_unit: string
  measurement_method: string
  critical_success_factor: boolean
}

export interface ExerciseSession {
  id: string
  scenario_id: string
  session_name: string
  session_description: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string
  actual_end?: string
  status: ExerciseStatus
  facilitators: string[]
  participants: ExerciseParticipant[]
  observers: string[]
  session_configuration: {
    scenario_modifications: any
    inject_schedule: any
    evaluation_focus: string[]
    communication_channels: string[]
    technology_setup: string[]
  }
  session_log: SessionLogEntry[]
  evaluations: ParticipantEvaluation[]
  session_outcomes: SessionOutcome[]
  lessons_learned: LessonLearned[]
  improvement_recommendations: string[]
  follow_up_actions: ActionItem[]
  session_artifacts: SessionArtifact[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExerciseParticipant {
  user_id: string
  assigned_role: string
  simulation_role?: string
  participation_level: 'full' | 'observer' | 'evaluator' | 'support'
  preparation_completed: boolean
  attendance_status: 'confirmed' | 'declined' | 'tentative' | 'attended' | 'absent'
  performance_metrics: ParticipantPerformance
}

export interface ParticipantPerformance {
  overall_score: number
  decision_making_score: number
  communication_score: number
  coordination_score: number
  timeliness_score: number
  stress_management_score: number
  learning_objectives_met: Record<string, boolean>
  strengths_identified: string[]
  improvement_areas: string[]
}

export interface SessionLogEntry {
  timestamp: string
  entry_type: 'inject_delivered' | 'decision_made' | 'action_taken' | 'communication_sent' | 'evaluation_note' | 'system_event'
  actor?: string
  description: string
  inject_id?: string
  decision_point_id?: string
  evaluation_score?: number
  notes?: string
}

export interface ParticipantEvaluation {
  participant_id: string
  evaluator_id: string
  evaluation_criteria: Record<string, any>
  overall_performance: ParticipantPerformance
  detailed_feedback: string
  recommendations: string[]
  evaluation_date: string
}

export interface SessionOutcome {
  outcome_type: 'objective_achievement' | 'skill_development' | 'process_improvement' | 'system_weakness' | 'coordination_gap'
  outcome_description: string
  evidence: string[]
  impact_level: CrisisLevel
  recommendations: string[]
  responsible_parties: string[]
  implementation_timeline: string
}

export interface LessonLearned {
  lesson_category: 'best_practice' | 'process_gap' | 'training_need' | 'system_limitation' | 'coordination_issue'
  lesson_title: string
  lesson_description: string
  context: string
  applicability: string[]
  implementation_priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
  related_scenarios: string[]
}

export interface ActionItem {
  title: string
  description: string
  assigned_to: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_date: string
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue'
  success_criteria: string[]
  resources_needed: string[]
}

export interface SessionArtifact {
  artifact_type: 'recording' | 'transcript' | 'decision_log' | 'timeline' | 'communication_log' | 'evaluation_report'
  file_name: string
  file_path: string
  description: string
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  created_at: string
}

export interface CrisisTrainingProgram {
  id: string
  program_name: string
  program_description: string
  target_audience: string[]
  training_objectives: LearningObjective[]
  prerequisite_knowledge: string[]
  training_modules: TrainingModule[]
  assessment_methods: AssessmentMethod[]
  certification_criteria: CertificationCriteria
  program_duration_hours: number
  delivery_methods: TrainingDeliveryMethod[]
  refresh_frequency_months: number
  compliance_requirements: string[]
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface TrainingModule {
  id: string
  module_name: string
  module_description: string
  learning_objectives: string[]
  content_type: 'presentation' | 'interactive' | 'simulation' | 'case_study' | 'practical_exercise'
  duration_minutes: number
  content_path: string
  prerequisites: string[]
  assessment_required: boolean
  passing_score?: number
  instructor_notes?: string
}

export interface AssessmentMethod {
  assessment_type: 'quiz' | 'practical_exercise' | 'scenario_response' | 'peer_evaluation' | 'instructor_observation'
  assessment_criteria: string[]
  scoring_method: string
  passing_threshold: number
  retake_policy: string
}

export interface CertificationCriteria {
  certification_name: string
  validity_period_months: number
  requirements: string[]
  maintenance_requirements: string[]
  renewal_process: string
}

export interface TrainingDeliveryMethod {
  method_type: 'classroom' | 'online' | 'blended' | 'workshop' | 'simulation' | 'mentoring'
  method_description: string
  maximum_participants: number
  instructor_requirements: string[]
  technology_requirements: string[]
}

export interface TrainingRecord {
  id: string
  user_id: string
  program_id: string
  enrollment_date: string
  start_date?: string
  completion_date?: string
  status: TrainingStatus
  progress_percentage: number
  modules_completed: string[]
  assessment_scores: Record<string, number>
  certification_earned?: string
  certification_expiry?: string
  instructor_feedback?: string
  next_refresh_due?: string
}

export interface PreparednessAssessment {
  id: string
  assessment_name: string
  assessment_scope: string[]
  assessment_date: string
  assessor_id: string
  assessment_methodology: string
  assessment_criteria: AssessmentCriterion[]
  findings: AssessmentFinding[]
  overall_score: number
  maturity_level: PreparednessLevel
  strengths: string[]
  weaknesses: string[]
  recommendations: AssessmentRecommendation[]
  next_assessment_due: string
  action_plan: ActionPlan
  compliance_status: ComplianceStatus[]
  created_at: string
  updated_at: string
}

export interface AssessmentCriterion {
  criterion_id: string
  criterion_name: string
  weight: number
  score: number
  evidence: string[]
  notes: string
}

export interface AssessmentFinding {
  finding_type: 'strength' | 'weakness' | 'gap' | 'opportunity' | 'risk'
  finding_description: string
  impact_level: CrisisLevel
  evidence: string[]
  recommendations: string[]
}

export interface AssessmentRecommendation {
  recommendation_id: string
  recommendation_title: string
  recommendation_description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation_effort: 'low' | 'medium' | 'high'
  estimated_cost: number
  expected_benefits: string[]
  success_measures: string[]
  responsible_party: string
  target_completion_date: string
}

export interface ActionPlan {
  plan_id: string
  objectives: string[]
  initiatives: Initiative[]
  timeline: string
  budget: number
  success_metrics: SuccessMetric[]
  governance: string[]
}

export interface Initiative {
  initiative_id: string
  initiative_name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date: string
  end_date: string
  responsible_party: string[]
  deliverables: string[]
  dependencies: string[]
  resource_requirements: ResourceRequirement[]
  success_criteria: string[]
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
}

export interface ComplianceStatus {
  requirement: string
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable'
  evidence: string[]
  gaps: string[]
  remediation_plan: string[]
}

// Input validation schemas
const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.nativeEnum(CrisisCategory),
  severity: z.nativeEnum(CrisisLevel),
  scenario_type: z.nativeEnum(ScenarioType),
  complexity_level: z.nativeEnum(PreparednessLevel),
  estimated_duration_hours: z.number().min(0.5).max(24),
  participant_roles: z.array(z.string()).min(1),
  learning_objectives: z.array(z.object({
    objective: z.string(),
    skill_area: z.enum(['decision_making', 'communication', 'coordination', 'technical', 'leadership', 'compliance']),
    proficiency_level: z.enum(['awareness', 'basic', 'intermediate', 'advanced', 'expert']),
    measurable_outcome: z.string(),
    assessment_method: z.string()
  })).min(1),
  scenario_narrative: z.object({
    background: z.string().min(1),
    context_setting: z.object({
      location: z.string(),
      time_of_day: z.string(),
      day_of_week: z.string(),
      season: z.string(),
      external_conditions: z.array(z.string()),
      organizational_state: z.string()
    }),
    initial_conditions: z.array(z.string()),
    escalation_factors: z.array(z.string()),
    complicating_factors: z.array(z.string()),
    resolution_paths: z.array(z.string())
  })
})

const ScheduleExerciseSchema = z.object({
  scenario_id: z.string().uuid(),
  session_name: z.string().min(1).max(200),
  session_description: z.string().optional(),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  facilitators: z.array(z.string().uuid()).min(1),
  participants: z.array(z.object({
    user_id: z.string().uuid(),
    assigned_role: z.string(),
    simulation_role: z.string().optional(),
    participation_level: z.enum(['full', 'observer', 'evaluator', 'support'])
  })).min(1),
  observers: z.array(z.string().uuid()).optional()
})

export class CrisisPreparednessService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * SCENARIO MANAGEMENT
   */

  async createScenario(
    data: z.infer<typeof CreateScenarioSchema>
  ): Promise<Result<CrisisScenario>> {
    const validatedData = this.validateWithContext(data, CreateScenarioSchema, 'create crisis scenario')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_scenarios',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const scenario: CrisisScenario = {
        id: crypto.randomUUID(),
        name: validatedData.data.name,
        description: validatedData.data.description,
        category: validatedData.data.category,
        severity: validatedData.data.severity,
        scenario_type: validatedData.data.scenario_type,
        complexity_level: validatedData.data.complexity_level,
        estimated_duration_hours: validatedData.data.estimated_duration_hours,
        participant_roles: validatedData.data.participant_roles,
        learning_objectives: validatedData.data.learning_objectives.map(obj => ({
          ...obj,
          id: crypto.randomUUID()
        })),
        scenario_narrative: {
          ...validatedData.data.scenario_narrative,
          timeline: []
        },
        injects: [],
        decision_points: [],
        evaluation_criteria: this.generateDefaultEvaluationCriteria(validatedData.data.scenario_type),
        resources_required: this.generateDefaultResourceRequirements(validatedData.data.participant_roles),
        prerequisites: [],
        success_metrics: this.generateDefaultSuccessMetrics(validatedData.data.learning_objectives),
        tags: this.generateScenarioTags(validatedData.data),
        industry_specific: false,
        regulatory_compliance: this.getApplicableRegulations(validatedData.data.category),
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        effectiveness_rating: 0,
        is_active: true
      }

      const { data: createdScenario, error } = await this.supabase
        .from('crisis_scenarios')
        .insert(scenario)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_crisis_scenario', 'crisis_scenario', scenario.id, {
        category: scenario.category,
        scenario_type: scenario.scenario_type,
        complexity_level: scenario.complexity_level
      })

      return createdScenario as CrisisScenario
    }, 'createScenario')
  }

  async addScenarioInject(
    scenarioId: string,
    injectData: Omit<ScenarioInject, 'id'>
  ): Promise<Result<ScenarioInject>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const inject: ScenarioInject = {
        ...injectData,
        id: crypto.randomUUID()
      }

      // Add inject to scenario
      const { data: scenario, error: fetchError } = await this.supabase
        .from('crisis_scenarios')
        .select('injects')
        .eq('id', scenarioId)
        .single()

      if (fetchError) throw fetchError

      const updatedInjects = [...(scenario.injects || []), inject]

      const { data: updatedScenario, error } = await this.supabase
        .from('crisis_scenarios')
        .update({
          injects: updatedInjects,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenarioId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('add_scenario_inject', 'crisis_scenario', scenarioId, {
        inject_type: inject.inject_type,
        target_roles: inject.target_roles
      })

      return inject
    }, 'addScenarioInject')
  }

  /**
   * EXERCISE EXECUTION
   */

  async scheduleExercise(
    data: z.infer<typeof ScheduleExerciseSchema>
  ): Promise<Result<ExerciseSession>> {
    const validatedData = this.validateWithContext(data, ScheduleExerciseSchema, 'schedule exercise')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const session: ExerciseSession = {
        id: crypto.randomUUID(),
        scenario_id: validatedData.data.scenario_id,
        session_name: validatedData.data.session_name,
        session_description: validatedData.data.session_description || '',
        scheduled_start: validatedData.data.scheduled_start,
        scheduled_end: validatedData.data.scheduled_end,
        status: ExerciseStatus.SCHEDULED,
        facilitators: validatedData.data.facilitators,
        participants: validatedData.data.participants.map(p => ({
          ...p,
          preparation_completed: false,
          attendance_status: 'confirmed',
          performance_metrics: {
            overall_score: 0,
            decision_making_score: 0,
            communication_score: 0,
            coordination_score: 0,
            timeliness_score: 0,
            stress_management_score: 0,
            learning_objectives_met: {},
            strengths_identified: [],
            improvement_areas: []
          }
        })),
        observers: validatedData.data.observers || [],
        session_configuration: {
          scenario_modifications: {},
          inject_schedule: {},
          evaluation_focus: [],
          communication_channels: ['email', 'in_person'],
          technology_setup: []
        },
        session_log: [],
        evaluations: [],
        session_outcomes: [],
        lessons_learned: [],
        improvement_recommendations: [],
        follow_up_actions: [],
        session_artifacts: [],
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdSession, error } = await this.supabase
        .from('exercise_sessions')
        .insert(session)
        .select()
        .single()

      if (error) throw error

      // Send invitations to participants
      await this.sendExerciseInvitations(session.id, session.participants, session.facilitators)

      // Create preparation materials
      await this.generatePreparationMaterials(session.id, session.scenario_id)

      await this.logActivity('schedule_crisis_exercise', 'exercise_session', session.id, {
        scenario_id: session.scenario_id,
        participant_count: session.participants.length,
        facilitator_count: session.facilitators.length
      })

      return createdSession as ExerciseSession
    }, 'scheduleExercise')
  }

  async startExercise(sessionId: string): Promise<Result<ExerciseSession>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: session, error } = await this.supabase
        .from('exercise_sessions')
        .update({
          status: ExerciseStatus.IN_PROGRESS,
          actual_start: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      // Initialize session log
      await this.addSessionLogEntry(sessionId, {
        entry_type: 'system_event',
        description: 'Exercise session started',
        actor: user.data.id
      })

      // Start inject delivery
      await this.initializeInjectDelivery(sessionId)

      await this.logActivity('start_crisis_exercise', 'exercise_session', sessionId)

      return session as ExerciseSession
    }, 'startExercise')
  }

  async deliverInject(
    sessionId: string,
    injectId: string,
    deliveryNotes?: string
  ): Promise<Result<void>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      // Get session and inject details
      const { data: session } = await this.supabase
        .from('exercise_sessions')
        .select('*, crisis_scenarios!inner(injects)')
        .eq('id', sessionId)
        .single()

      if (!session) throw new Error('Session not found')

      const inject = session.crisis_scenarios.injects.find((i: any) => i.id === injectId)
      if (!inject) throw new Error('Inject not found')

      // Log inject delivery
      await this.addSessionLogEntry(sessionId, {
        entry_type: 'inject_delivered',
        description: `Inject delivered: ${inject.inject_title}`,
        inject_id: injectId,
        actor: user.data.id,
        notes: deliveryNotes
      })

      // Notify target roles
      await this.notifyInjectTargets(sessionId, inject)

      await this.logActivity('deliver_exercise_inject', 'exercise_session', sessionId, {
        inject_id: injectId,
        inject_type: inject.inject_type
      })
    }, 'deliverInject')
  }

  async recordExerciseDecision(
    sessionId: string,
    decisionPointId: string,
    participantId: string,
    decision: {
      option_selected: string
      rationale: string
      decision_time: string
      information_used: string[]
      consultation_participants: string[]
    }
  ): Promise<Result<void>> {
    return this.executeDbOperation(async () => {
      // Log decision
      await this.addSessionLogEntry(sessionId, {
        entry_type: 'decision_made',
        description: `Decision made at decision point: ${decisionPointId}`,
        decision_point_id: decisionPointId,
        actor: participantId,
        notes: `Selected option: ${decision.option_selected}. Rationale: ${decision.rationale}`
      })

      // Evaluate decision quality
      const evaluationScore = await this.evaluateDecision(sessionId, decisionPointId, decision)

      // Update participant performance
      await this.updateParticipantPerformance(sessionId, participantId, {
        decision_point_id: decisionPointId,
        score: evaluationScore,
        decision_data: decision
      })

      await this.logActivity('record_exercise_decision', 'exercise_session', sessionId, {
        decision_point_id: decisionPointId,
        participant_id: participantId,
        option_selected: decision.option_selected,
        evaluation_score: evaluationScore
      })
    }, 'recordExerciseDecision')
  }

  /**
   * TRAINING PROGRAM MANAGEMENT
   */

  async createTrainingProgram(
    programData: Omit<CrisisTrainingProgram, 'id' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<Result<CrisisTrainingProgram>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const program: CrisisTrainingProgram = {
        ...programData,
        id: crypto.randomUUID(),
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdProgram, error } = await this.supabase
        .from('crisis_training_programs')
        .insert(program)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_training_program', 'crisis_training_program', program.id, {
        target_audience: program.target_audience,
        duration_hours: program.program_duration_hours
      })

      return createdProgram as CrisisTrainingProgram
    }, 'createTrainingProgram')
  }

  async enrollInTraining(
    programId: string,
    userId: string,
    enrollmentData: {
      start_date?: string
      target_completion_date?: string
    } = {}
  ): Promise<Result<TrainingRecord>> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser.success) return currentUser

    return this.executeDbOperation(async () => {
      const record: TrainingRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        program_id: programId,
        enrollment_date: new Date().toISOString(),
        start_date: enrollmentData.start_date,
        status: TrainingStatus.NOT_STARTED,
        progress_percentage: 0,
        modules_completed: [],
        assessment_scores: {}
      }

      const { data: createdRecord, error } = await this.supabase
        .from('training_records')
        .insert(record)
        .select()
        .single()

      if (error) throw error

      // Send enrollment notification
      await this.sendTrainingEnrollmentNotification(userId, programId)

      await this.logActivity('enroll_in_training', 'training_record', record.id, {
        program_id: programId,
        enrolled_user: userId
      })

      return createdRecord as TrainingRecord
    }, 'enrollInTraining')
  }

  /**
   * PREPAREDNESS ASSESSMENT
   */

  async conductPreparednessAssessment(
    assessmentData: {
      assessment_name: string
      assessment_scope: string[]
      assessment_methodology: string
      assessment_criteria: Omit<AssessmentCriterion, 'score'>[]
    }
  ): Promise<Result<PreparednessAssessment>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      // Initialize assessment with criteria
      const criteriaWithScores = assessmentData.assessment_criteria.map(criterion => ({
        ...criterion,
        score: 0, // Will be updated during assessment
        evidence: [],
        notes: ''
      }))

      const assessment: PreparednessAssessment = {
        id: crypto.randomUUID(),
        assessment_name: assessmentData.assessment_name,
        assessment_scope: assessmentData.assessment_scope,
        assessment_date: new Date().toISOString(),
        assessor_id: user.data.id,
        assessment_methodology: assessmentData.assessment_methodology,
        assessment_criteria: criteriaWithScores,
        findings: [],
        overall_score: 0,
        maturity_level: PreparednessLevel.BASIC,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        next_assessment_due: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        action_plan: {
          plan_id: crypto.randomUUID(),
          objectives: [],
          initiatives: [],
          timeline: '12 months',
          budget: 0,
          success_metrics: [],
          governance: []
        },
        compliance_status: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdAssessment, error } = await this.supabase
        .from('preparedness_assessments')
        .insert(assessment)
        .select()
        .single()

      if (error) throw error

      // Generate assessment questionnaire
      await this.generateAssessmentQuestionnaire(assessment.id)

      await this.logActivity('create_preparedness_assessment', 'preparedness_assessment', assessment.id, {
        assessment_scope: assessment.assessment_scope,
        criteria_count: assessment.assessment_criteria.length
      })

      return createdAssessment as PreparednessAssessment
    }, 'conductPreparednessAssessment')
  }

  /**
   * ANALYTICS AND REPORTING
   */

  async generatePreparednessReport(
    timeRange: { start: string; end: string },
    scope?: {
      include_scenarios?: boolean
      include_exercises?: boolean
      include_training?: boolean
      include_assessments?: boolean
    }
  ): Promise<Result<{
    executive_summary: {
      overall_preparedness_score: number
      trend_analysis: string
      key_achievements: string[]
      priority_recommendations: string[]
    }
    scenario_analytics: {
      total_scenarios: number
      scenarios_by_category: Record<CrisisCategory, number>
      effectiveness_ratings: Record<string, number>
      utilization_metrics: any
    }
    exercise_analytics: {
      total_exercises: number
      exercises_by_type: Record<ScenarioType, number>
      participant_engagement: any
      learning_outcomes: any
      improvement_trends: any
    }
    training_analytics: {
      enrollment_metrics: any
      completion_rates: any
      competency_development: any
      certification_status: any
    }
    assessment_insights: {
      maturity_progression: any
      gap_analysis: any
      compliance_status: any
      benchmark_comparison: any
    }
  }>> {
    return this.executeDbOperation(async () => {
      // Collect data for the specified time range
      const [scenarios, exercises, training, assessments] = await Promise.all([
        scope?.include_scenarios !== false ? this.getScenarioAnalytics(timeRange) : null,
        scope?.include_exercises !== false ? this.getExerciseAnalytics(timeRange) : null,
        scope?.include_training !== false ? this.getTrainingAnalytics(timeRange) : null,
        scope?.include_assessments !== false ? this.getAssessmentAnalytics(timeRange) : null
      ])

      // Generate executive summary
      const executiveSummary = await this.generateExecutiveSummary(scenarios, exercises, training, assessments)

      return {
        executive_summary: executiveSummary,
        scenario_analytics: scenarios || this.getEmptyScenarioAnalytics(),
        exercise_analytics: exercises || this.getEmptyExerciseAnalytics(),
        training_analytics: training || this.getEmptyTrainingAnalytics(),
        assessment_insights: assessments || this.getEmptyAssessmentAnalytics()
      }
    }, 'generatePreparednessReport')
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private generateDefaultEvaluationCriteria(scenarioType: ScenarioType): EvaluationCriterion[] {
    const baseCriteria = [
      {
        id: crypto.randomUUID(),
        criterion_name: 'Decision Making Quality',
        criterion_description: 'Quality and appropriateness of decisions made',
        weight: 0.25,
        measurement_method: 'quality_assessment' as const,
        scale_type: 'numeric' as const,
        scale_definition: { min: 1, max: 10, description: '1-10 scale, 10 being excellent' },
        evaluator_roles: ['facilitator', 'subject_matter_expert'],
        evaluation_timing: 'post_exercise' as const
      },
      {
        id: crypto.randomUUID(),
        criterion_name: 'Communication Effectiveness',
        criterion_description: 'Clarity and timeliness of communication',
        weight: 0.20,
        measurement_method: 'observation' as const,
        scale_type: 'numeric' as const,
        scale_definition: { min: 1, max: 10, description: '1-10 scale, 10 being excellent' },
        evaluator_roles: ['facilitator'],
        evaluation_timing: 'real_time' as const
      },
      {
        id: crypto.randomUUID(),
        criterion_name: 'Response Timeliness',
        criterion_description: 'Speed of response to critical events',
        weight: 0.15,
        measurement_method: 'timing' as const,
        scale_type: 'percentage' as const,
        scale_definition: { description: 'Percentage of responses within target time' },
        evaluator_roles: ['facilitator'],
        evaluation_timing: 'real_time' as const
      }
    ]

    // Add scenario-specific criteria
    if (scenarioType === ScenarioType.FULL_SCALE_EXERCISE) {
      baseCriteria.push({
        id: crypto.randomUUID(),
        criterion_name: 'Resource Coordination',
        criterion_description: 'Effectiveness of resource allocation and coordination',
        weight: 0.20,
        measurement_method: 'observation' as const,
        scale_type: 'numeric' as const,
        scale_definition: { min: 1, max: 10, description: '1-10 scale, 10 being excellent' },
        evaluator_roles: ['facilitator', 'logistics_observer'],
        evaluation_timing: 'post_exercise' as const
      })
    }

    return baseCriteria
  }

  private generateDefaultResourceRequirements(participantRoles: string[]): ResourceRequirement[] {
    const requirements: ResourceRequirement[] = []

    // Human resources
    requirements.push({
      resource_type: 'human',
      resource_name: 'Facilitator',
      quantity: 1,
      duration_hours: 8,
      availability_requirement: 'dedicated',
      specialized_skills: ['crisis management', 'facilitation'],
      backup_options: ['senior_crisis_manager']
    })

    // Technical resources
    requirements.push({
      resource_type: 'technical',
      resource_name: 'Communication System',
      quantity: 1,
      duration_hours: 8,
      availability_requirement: 'dedicated',
      backup_options: ['backup_communication_system']
    })

    // Facility
    requirements.push({
      resource_type: 'facility',
      resource_name: 'Training Room',
      quantity: 1,
      duration_hours: 8,
      availability_requirement: 'scheduled',
      backup_options: ['virtual_meeting_room']
    })

    return requirements
  }

  private generateDefaultSuccessMetrics(learningObjectives: any[]): SuccessMetric[] {
    return [
      {
        metric_name: 'Learning Objectives Achievement',
        metric_description: 'Percentage of learning objectives successfully achieved',
        target_value: 80,
        measurement_unit: 'percentage',
        measurement_method: 'post-exercise assessment',
        critical_success_factor: true
      },
      {
        metric_name: 'Participant Satisfaction',
        metric_description: 'Average participant satisfaction rating',
        target_value: 4,
        measurement_unit: 'scale_1_5',
        measurement_method: 'post-exercise survey',
        critical_success_factor: false
      },
      {
        metric_name: 'Exercise Completion Rate',
        metric_description: 'Percentage of planned exercise activities completed',
        target_value: 95,
        measurement_unit: 'percentage',
        measurement_method: 'facilitator assessment',
        critical_success_factor: true
      }
    ]
  }

  private generateScenarioTags(scenarioData: any): string[] {
    const tags = [
      scenarioData.category,
      scenarioData.severity,
      scenarioData.scenario_type,
      scenarioData.complexity_level
    ]

    // Add skill-based tags
    const skillAreas = scenarioData.learning_objectives.map((obj: any) => obj.skill_area)
    tags.push(...[...new Set(skillAreas)])

    return tags
  }

  private getApplicableRegulations(category: CrisisCategory): string[] {
    const regulationMap: Record<CrisisCategory, string[]> = {
      [CrisisCategory.FINANCIAL]: ['SOX', 'SEC_REPORTING', 'BASEL_III'],
      [CrisisCategory.CYBERSECURITY]: ['GDPR', 'CCPA', 'NIST_FRAMEWORK'],
      [CrisisCategory.REGULATORY]: ['INDUSTRY_SPECIFIC', 'FEDERAL_REGULATIONS'],
      [CrisisCategory.ENVIRONMENTAL]: ['EPA_REQUIREMENTS', 'ISO_14001'],
      [CrisisCategory.LEGAL]: ['LEGAL_COMPLIANCE', 'LITIGATION_HOLD'],
      [CrisisCategory.OPERATIONAL]: ['BUSINESS_CONTINUITY', 'ISO_22301'],
      [CrisisCategory.REPUTATIONAL]: ['PUBLIC_RELATIONS', 'MEDIA_GUIDELINES'],
      [CrisisCategory.STRATEGIC]: ['CORPORATE_GOVERNANCE', 'BOARD_OVERSIGHT']
    }

    return regulationMap[category] || []
  }

  private async sendExerciseInvitations(
    sessionId: string,
    participants: ExerciseParticipant[],
    facilitators: string[]
  ): Promise<void> {
    const allInvitees = [
      ...participants.map(p => p.user_id),
      ...facilitators
    ]

    const notifications = allInvitees.map(userId => ({
      user_id: userId,
      type: 'exercise_invitation',
      title: 'Crisis Exercise Invitation',
      message: 'You have been invited to participate in a crisis exercise',
      priority: 'medium',
      metadata: { session_id: sessionId }
    }))

    await this.supabase.from('notifications').insert(notifications)
  }

  private async generatePreparationMaterials(sessionId: string, scenarioId: string): Promise<void> {
    // Generate preparation materials for participants
    console.log(`Generating preparation materials for session ${sessionId} with scenario ${scenarioId}`)
  }

  private async addSessionLogEntry(
    sessionId: string,
    logEntry: Omit<SessionLogEntry, 'timestamp'>
  ): Promise<void> {
    const entry: SessionLogEntry = {
      ...logEntry,
      timestamp: new Date().toISOString()
    }

    // Add entry to session log
    const { data: session } = await this.supabase
      .from('exercise_sessions')
      .select('session_log')
      .eq('id', sessionId)
      .single()

    if (session) {
      const updatedLog = [...(session.session_log || []), entry]
      
      await this.supabase
        .from('exercise_sessions')
        .update({
          session_log: updatedLog,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    }
  }

  private async initializeInjectDelivery(sessionId: string): Promise<void> {
    // Initialize the inject delivery system for the exercise
    console.log(`Initializing inject delivery for session ${sessionId}`)
  }

  private async notifyInjectTargets(sessionId: string, inject: any): Promise<void> {
    // Notify target roles about the inject
    console.log(`Notifying targets for inject: ${inject.inject_title}`)
  }

  private async evaluateDecision(sessionId: string, decisionPointId: string, decision: any): Promise<number> {
    // Evaluate the quality of the decision made
    return 8.5 // Placeholder score
  }

  private async updateParticipantPerformance(
    sessionId: string,
    participantId: string,
    performanceData: any
  ): Promise<void> {
    // Update participant performance metrics
    console.log(`Updating performance for participant ${participantId}`)
  }

  private async sendTrainingEnrollmentNotification(userId: string, programId: string): Promise<void> {
    const notification = {
      user_id: userId,
      type: 'training_enrollment',
      title: 'Crisis Training Enrollment',
      message: 'You have been enrolled in a crisis management training program',
      priority: 'medium',
      metadata: { program_id: programId }
    }

    await this.supabase.from('notifications').insert([notification])
  }

  private async generateAssessmentQuestionnaire(assessmentId: string): Promise<void> {
    // Generate assessment questionnaire based on criteria
    console.log(`Generating questionnaire for assessment ${assessmentId}`)
  }

  private async getScenarioAnalytics(timeRange: { start: string; end: string }): Promise<any> {
    // Get scenario analytics for the time range
    return {
      total_scenarios: 0,
      scenarios_by_category: {},
      effectiveness_ratings: {},
      utilization_metrics: {}
    }
  }

  private async getExerciseAnalytics(timeRange: { start: string; end: string }): Promise<any> {
    // Get exercise analytics for the time range
    return {
      total_exercises: 0,
      exercises_by_type: {},
      participant_engagement: {},
      learning_outcomes: {},
      improvement_trends: {}
    }
  }

  private async getTrainingAnalytics(timeRange: { start: string; end: string }): Promise<any> {
    // Get training analytics for the time range
    return {
      enrollment_metrics: {},
      completion_rates: {},
      competency_development: {},
      certification_status: {}
    }
  }

  private async getAssessmentAnalytics(timeRange: { start: string; end: string }): Promise<any> {
    // Get assessment analytics for the time range
    return {
      maturity_progression: {},
      gap_analysis: {},
      compliance_status: {},
      benchmark_comparison: {}
    }
  }

  private getEmptyScenarioAnalytics(): any {
    return {
      total_scenarios: 0,
      scenarios_by_category: {},
      effectiveness_ratings: {},
      utilization_metrics: {}
    }
  }

  private getEmptyExerciseAnalytics(): any {
    return {
      total_exercises: 0,
      exercises_by_type: {},
      participant_engagement: {},
      learning_outcomes: {},
      improvement_trends: {}
    }
  }

  private getEmptyTrainingAnalytics(): any {
    return {
      enrollment_metrics: {},
      completion_rates: {},
      competency_development: {},
      certification_status: {}
    }
  }

  private getEmptyAssessmentAnalytics(): any {
    return {
      maturity_progression: {},
      gap_analysis: {},
      compliance_status: {},
      benchmark_comparison: {}
    }
  }

  private async generateExecutiveSummary(
    scenarios: any,
    exercises: any,
    training: any,
    assessments: any
  ): Promise<any> {
    return {
      overall_preparedness_score: 75,
      trend_analysis: 'Improving',
      key_achievements: ['Increased exercise participation', 'Improved response times'],
      priority_recommendations: ['Enhance cybersecurity training', 'Increase exercise frequency']
    }
  }
}