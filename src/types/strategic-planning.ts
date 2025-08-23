/**
 * Strategic Planning & OKR Management Types
 * 
 * Comprehensive type definitions for the strategic planning platform
 */

// ============================================================================
// Core Strategic Initiative Types
// ============================================================================

export interface StrategicInitiative {
  id: string
  organization_id: string
  name: string
  description: string
  category: 'growth' | 'operational' | 'innovation' | 'risk' | 'sustainability'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  
  // Timeline
  start_date: Date
  end_date: Date
  milestones: InitiativeMilestone[]
  
  // Resources
  budget_allocated: number
  budget_used: number
  resource_requirements: ResourceRequirement[]
  
  // Progress
  progress_percentage: number
  health_score: number
  risk_score: number
  
  // Relationships
  dependencies: string[]
  linked_okrs: string[]
  
  // Metadata
  owner_id: string
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface InitiativeMilestone {
  id: string
  name: string
  description?: string
  due_date: Date
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  completion_date?: Date
  deliverables: string[]
  success_criteria: string[]
}

export interface ResourceRequirement {
  type: 'human' | 'financial' | 'technical' | 'external'
  name: string
  quantity: number
  unit: string
  cost_per_unit: number
  availability_status: 'available' | 'limited' | 'unavailable'
}

// ============================================================================
// OKR System Types
// ============================================================================

export interface OKR {
  id: string
  organization_id: string
  parent_okr_id?: string
  level: 'board' | 'executive' | 'department' | 'team' | 'individual'
  
  // Objective
  objective: string
  objective_description?: string
  objective_category: 'growth' | 'customer' | 'operational' | 'learning' | 'financial'
  
  // Key Results
  key_results: KeyResult[]
  
  // Timeline
  period_type: 'annual' | 'quarterly' | 'monthly'
  start_date: Date
  end_date: Date
  
  // Progress & Scoring
  overall_progress: number
  confidence_level: number
  health_status: 'on_track' | 'at_risk' | 'off_track'
  
  // Alignment
  strategic_initiatives: string[]
  cascade_alignment_score: number
  
  // Ownership
  owner_id: string
  contributors: string[]
  
  // Hierarchy (populated in queries)
  children?: OKR[]
  
  // Metadata
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface KeyResult {
  id: string
  description: string
  metric_type: 'number' | 'percentage' | 'boolean' | 'currency'
  baseline_value: number
  target_value: number
  current_value: number
  unit: string
  measurement_frequency: 'daily' | 'weekly' | 'monthly'
  progress_updates: ProgressUpdate[]
  automated_tracking: boolean
  data_source?: string
}

export interface ProgressUpdate {
  date: Date
  value: number
  confidence: number
  notes?: string
  updated_by: string
}

export interface AlignmentGap {
  okr_id: string
  gap_type: 'missing_parent' | 'misaligned_objective' | 'weak_cascade'
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation: string
}

// ============================================================================
// Scenario Planning Types
// ============================================================================

export interface ScenarioPlan {
  id: string
  organization_id: string
  name: string
  description: string
  scenario_type: 'optimistic' | 'realistic' | 'pessimistic' | 'stress_test'
  
  // Variables
  key_variables: ScenarioVariable[]
  
  // Assumptions
  market_assumptions: MarketAssumption[]
  internal_assumptions: InternalAssumption[]
  
  // Outcomes
  projected_outcomes: ProjectedOutcome[]
  risk_assessments: RiskAssessment[]
  
  // Analysis
  monte_carlo_runs: number
  confidence_intervals: ConfidenceInterval[]
  sensitivity_analysis: SensitivityResult[]
  
  // Metadata
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface ScenarioVariable {
  name: string
  type: 'market_size' | 'growth_rate' | 'competition' | 'regulation' | 'technology'
  min_value: number
  max_value: number
  most_likely_value: number
  distribution: 'normal' | 'uniform' | 'triangular' | 'beta'
  correlation_factors: Record<string, number>
}

export interface MarketAssumption {
  category: string
  description: string
  probability: number
  impact_score: number
  confidence_level: number
}

export interface InternalAssumption {
  department: string
  description: string
  feasibility_score: number
  resource_impact: number
}

export interface ProjectedOutcome {
  metric: string
  baseline: number
  projected_value: number
  probability_range: [number, number]
  impact_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface RiskAssessment {
  risk_category: string
  description: string
  probability: number
  impact: number
  risk_score: number
  mitigation_strategies: string[]
}

export interface ConfidenceInterval {
  metric: string
  percentile_10: number
  percentile_25: number
  percentile_50: number
  percentile_75: number
  percentile_90: number
}

export interface SensitivityResult {
  variable: string
  impact_on_outcome: number
  correlation_coefficient: number
  influence_rank: number
}

// ============================================================================
// Performance Scorecard Types
// ============================================================================

export interface PerformanceScorecard {
  id: string
  organization_id: string
  name: string
  scorecard_type: 'balanced' | 'custom' | 'kpi_dashboard' | 'executive'
  
  // Perspectives
  perspectives: ScorecardPerspective[]
  
  // Performance
  overall_score: number
  trend_analysis: TrendAnalysis
  benchmark_comparison: BenchmarkComparison
  
  // Settings
  refresh_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
  auto_alerts: AlertConfiguration[]
  
  // Access
  visibility: 'board' | 'executives' | 'all_managers' | 'organization'
  access_permissions: AccessPermission[]
  
  // Metadata
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface ScorecardPerspective {
  name: string
  weight: number
  color: string
  icon: string
  metrics: ScorecardMetric[]
}

export interface ScorecardMetric {
  id: string
  name: string
  description: string
  category: string
  
  // Values
  current_value: number
  target_value: number
  baseline_value: number
  
  // Display
  unit: string
  format: 'number' | 'percentage' | 'currency' | 'ratio'
  direction: 'higher_is_better' | 'lower_is_better' | 'target_is_best'
  
  // Thresholds
  green_threshold: number
  yellow_threshold: number
  red_threshold: number
  
  // Performance
  performance_score: number
  trend: 'improving' | 'declining' | 'stable'
  variance_from_target: number
  
  // Data
  data_source: string
  calculation_method: string
  last_updated: Date
}

export interface TrendAnalysis {
  period: 'week' | 'month' | 'quarter' | 'year'
  data_points: TrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
  correlation_analysis: CorrelationResult[]
  seasonality_detected: boolean
}

export interface TrendDataPoint {
  date: Date
  value: number
  forecast: boolean
  confidence_interval?: [number, number]
}

export interface CorrelationResult {
  metric_a: string
  metric_b: string
  correlation_coefficient: number
  p_value: number
  relationship_strength: 'strong' | 'moderate' | 'weak' | 'none'
}

export interface BenchmarkComparison {
  industry: string
  company_size: string
  benchmarks: BenchmarkMetric[]
  performance_ranking: 'top_quartile' | 'above_median' | 'below_median' | 'bottom_quartile'
}

export interface BenchmarkMetric {
  metric: string
  our_value: number
  industry_median: number
  top_quartile: number
  bottom_quartile: number
  percentile_rank: number
}

export interface AlertConfiguration {
  metric: string
  condition: 'above' | 'below' | 'equal' | 'change_percent'
  threshold: number
  recipients: string[]
  notification_method: 'email' | 'in_app' | 'both'
  frequency_limit: 'immediate' | 'daily' | 'weekly'
}

export interface AccessPermission {
  user_id: string
  permission_level: 'view' | 'edit' | 'admin'
  perspective_restrictions?: string[]
}

// ============================================================================
// Financial Integration Types
// ============================================================================

export interface BudgetConstraint {
  type: 'min_allocation' | 'max_allocation' | 'fixed_allocation' | 'ratio_constraint'
  initiative_id?: string
  category?: string
  value: number
  description: string
}

export interface BudgetOptimizationResult {
  total_budget: number
  allocations: BudgetAllocation[]
  optimization_score: number
  constraints_satisfied: boolean
  improvement_recommendations: string[]
}

export interface BudgetAllocation {
  initiative_id: string
  allocated_amount: number
  percentage_of_total: number
  expected_roi: number
  risk_score: number
  confidence: number
}

export interface ROIAnalysis {
  roi_percentage: number
  total_investment: number
  total_return: number
  payback_period: number
  npv: number
  irr: number
  risk_adjusted_roi: number
}

export interface FinancialMetric {
  id: string
  initiative_id: string
  metric_type: 'investment' | 'return' | 'cost_savings' | 'revenue_increase'
  value: number
  currency: string
  period_start: Date
  period_end: Date
  confidence_level: number
  source: string
  notes?: string
}

// ============================================================================
// Predictive Analytics Types
// ============================================================================

export interface StrategicForecast {
  id: string
  organization_id: string
  forecast_type: 'performance' | 'risk' | 'opportunity' | 'resource_demand'
  time_horizon: number
  
  // Predictions
  predictions: ForecastPrediction[]
  confidence: number
  model_accuracy: number
  
  // Analysis
  key_factors: string[]
  scenarios: ForecastScenario[]
  
  // Metadata
  model_version: string
  training_data_period: { start: Date; end: Date }
  created_by: string
  created_at: Date
}

export interface ForecastPrediction {
  metric: string
  current_value: number
  predicted_value: number
  confidence_interval: [number, number]
  trend: 'increasing' | 'decreasing' | 'stable'
  probability_distribution: ProbabilityPoint[]
}

export interface ForecastScenario {
  name: string
  probability: number
  outcomes: Record<string, number>
  implications: string[]
  recommended_actions: string[]
}

export interface ProbabilityPoint {
  value: number
  probability: number
}

// ============================================================================
// Workflow & Planning Types
// ============================================================================

export interface PlanningCycle {
  id: string
  organization_id: string
  cycle_type: 'annual' | 'quarterly' | 'monthly'
  name: string
  status: 'planning' | 'review' | 'active' | 'completed'
  
  // Timeline
  planning_start: Date
  planning_end: Date
  execution_start: Date
  execution_end: Date
  
  // Phases
  phases: PlanningPhase[]
  
  // Participants
  stakeholders: PlanningStakeholder[]
  
  // Content
  strategic_themes: string[]
  objectives: string[]
  success_metrics: string[]
  
  // Metadata
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface PlanningPhase {
  id: string
  name: string
  description: string
  start_date: Date
  end_date: Date
  status: 'pending' | 'active' | 'completed' | 'skipped'
  required_inputs: string[]
  deliverables: string[]
  responsible_parties: string[]
}

export interface PlanningStakeholder {
  user_id: string
  role: 'sponsor' | 'owner' | 'contributor' | 'reviewer'
  permissions: string[]
  notification_preferences: {
    phase_changes: boolean
    milestone_updates: boolean
    approval_requests: boolean
  }
}

// ============================================================================
// Alert & Notification Types
// ============================================================================

export interface Alert {
  id: string
  type: 'performance' | 'threshold' | 'trend' | 'alignment' | 'budget'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  
  // Context
  related_entity_type: 'initiative' | 'okr' | 'scorecard' | 'forecast'
  related_entity_id: string
  metric?: string
  current_value?: number
  threshold_value?: number
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved'
  acknowledged_by?: string
  acknowledged_at?: Date
  resolved_by?: string
  resolved_at?: Date
  
  // Metadata
  created_at: Date
  expires_at?: Date
}

export interface Recommendation {
  id: string
  category: 'performance' | 'optimization' | 'risk' | 'alignment' | 'resource'
  title: string
  description: string
  
  // Scoring
  impact_score: number
  effort_score: number
  confidence_score: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // Actions
  actions: RecommendedAction[]
  
  // Context
  related_entities: {
    type: string
    id: string
    name: string
  }[]
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
  
  // Metadata
  generated_by: 'system' | 'ai' | 'user'
  created_at: Date
  expires_at?: Date
}

export interface RecommendedAction {
  description: string
  estimated_effort: number
  expected_impact: number
  dependencies?: string[]
  timeline?: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface StrategicPlanningApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: Date
    processing_time_ms: number
    cache_hit: boolean
    version: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface StrategicInitiativeFilters {
  status?: string[]
  category?: string[]
  priority?: string[]
  date_range?: { start: Date; end: Date }
  owner_ids?: string[]
  budget_range?: { min: number; max: number }
  health_score_range?: { min: number; max: number }
}

export interface OKRFilters {
  level?: string[]
  status?: string[]
  category?: string[]
  period?: { start: Date; end: Date }
  owner_ids?: string[]
  progress_range?: { min: number; max: number }
  confidence_range?: { min: number; max: number }
}

export interface ScorecardFilters {
  type?: string[]
  visibility?: string[]
  refresh_frequency?: string[]
  performance_range?: { min: number; max: number }
}

// ============================================================================
// Dashboard & Analytics Types
// ============================================================================

export interface StrategicDashboard {
  organization_id: string
  snapshot_date: Date
  
  // Summary Metrics
  total_initiatives: number
  active_initiatives: number
  total_okrs: number
  on_track_okrs: number
  total_budget_allocated: number
  budget_utilization_percentage: number
  
  // Performance Indicators
  overall_strategic_health: number
  alignment_score: number
  execution_velocity: number
  risk_exposure: number
  
  // Trends
  progress_trend: TrendDataPoint[]
  budget_burn_rate: TrendDataPoint[]
  alignment_trend: TrendDataPoint[]
  
  // Top Issues
  critical_alerts: Alert[]
  top_risks: RiskAssessment[]
  key_recommendations: Recommendation[]
  
  // Forecasts
  performance_forecast: ForecastPrediction[]
  budget_forecast: ForecastPrediction[]
}

export interface ExecutiveSummary {
  period: { start: Date; end: Date }
  
  // Highlights
  key_achievements: string[]
  major_challenges: string[]
  strategic_shifts: string[]
  
  // Performance
  okr_summary: {
    total: number
    achieved: number
    on_track: number
    at_risk: number
    off_track: number
  }
  
  // Financial
  budget_performance: {
    allocated: number
    spent: number
    committed: number
    remaining: number
    roi_achieved: number
  }
  
  // Future Outlook
  upcoming_milestones: InitiativeMilestone[]
  risk_mitigation_actions: string[]
  resource_needs: ResourceRequirement[]
  
  // Recommendations
  board_actions: RecommendedAction[]
  strategic_adjustments: RecommendedAction[]
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface StrategicPlanningConfig {
  organization_id: string
  
  // Planning Cycles
  planning_calendar: {
    annual_planning_month: number
    quarterly_reviews: number[]
    monthly_updates: boolean
  }
  
  // OKR Settings
  okr_settings: {
    max_key_results_per_okr: number
    default_confidence_threshold: number
    auto_cascade_enabled: boolean
    scoring_method: 'linear' | 'exponential' | 'threshold'
  }
  
  // Scorecard Settings
  scorecard_settings: {
    default_perspectives: string[]
    benchmark_sources: string[]
    alert_thresholds: Record<string, number>
  }
  
  // Integration Settings
  integrations: {
    financial_system: string
    hr_system: string
    crm_system: string
    project_management: string
  }
  
  // Notification Preferences
  notifications: {
    milestone_reminders: boolean
    progress_updates: boolean
    risk_alerts: boolean
    budget_warnings: boolean
  }
}

export default {}