/**
 * Risk Dashboard Type Definitions
 * Type definitions for the risk management and dashboard system
 */

export interface RiskFactor {
  id: string
  name: string
  category: 'operational' | 'financial' | 'strategic' | 'compliance' | 'technology' | 'cyber'
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number
  trend: 'up' | 'down' | 'stable'
  description: string
  impact: number // 1-10 scale
  likelihood: number // 1-10 scale
  lastAssessed: Date
  owner: string
  mitigation: string
  dueDate?: Date
}

export interface RiskMetric {
  label: string
  value: string | number
  change: number
  icon: string
  color: string
  description: string
}

export interface ComplianceItem {
  id: string
  regulation: string
  status: 'compliant' | 'at_risk' | 'non_compliant'
  score: number
  nextReview: Date
  issues: number
}

export interface TrendDataPoint {
  date: string
  overallRisk: number
  highRisks: number
  mediumRisks: number
  lowRisks: number
  criticalRisks: number
}

export interface RiskHeatmapItem {
  id: string
  name: string
  impact: number // 1-5 scale for heatmap
  likelihood: number // 1-5 scale for heatmap
  category: string
  level: 'low' | 'medium' | 'high' | 'critical'
}

export interface RiskAssessmentResult {
  id: string
  organizationId: string
  assessmentDate: Date
  methodology: string
  scope: string
  totalRisks: number
  risksByLevel: {
    critical: number
    high: number
    medium: number
    low: number
  }
  overallRiskScore: number
  complianceScore: number
  recommendations: string[]
  nextReviewDate: Date
  assessedBy: string
  status: 'draft' | 'completed' | 'approved' | 'archived'
}

export interface RiskMitigationAction {
  id: string
  riskId: string
  description: string
  owner: string
  targetDate: Date
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'critical'
  cost?: number
  expectedImpact: string
  progress: number // 0-100
  lastUpdated: Date
}

export interface RiskAlert {
  id: string
  riskId: string
  type: 'threshold_exceeded' | 'review_due' | 'mitigation_overdue' | 'new_risk_identified'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  createdAt: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  status: 'active' | 'acknowledged' | 'resolved'
  metadata?: Record<string, any>
}

export interface RiskCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  riskCount: number
  averageScore: number
  trend: 'up' | 'down' | 'stable'
}

export interface ComplianceFramework {
  id: string
  name: string
  description: string
  requirements: ComplianceRequirement[]
  overallScore: number
  lastAssessment: Date
  nextAssessment: Date
  status: 'compliant' | 'partial' | 'non_compliant'
}

export interface ComplianceRequirement {
  id: string
  frameworkId: string
  requirement: string
  description: string
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed'
  evidence: string[]
  gaps: string[]
  remediation: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate?: Date
  owner: string
}

export interface RiskDashboardFilters {
  categories?: string[]
  levels?: string[]
  owners?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  trends?: string[]
  complianceStatus?: string[]
}

export interface RiskDashboardState {
  loading: boolean
  error: string | null
  lastRefresh: Date
  filters: RiskDashboardFilters
  data: {
    riskFactors: RiskFactor[]
    metrics: RiskMetric[]
    complianceItems: ComplianceItem[]
    trendData: TrendDataPoint[]
    alerts: RiskAlert[]
  } | null
}

// Risk calculation utilities
export interface RiskCalculation {
  inherentRisk: number
  residualRisk: number
  riskReduction: number
  controlEffectiveness: number
}

// Risk reporting types
export interface RiskReport {
  id: string
  title: string
  type: 'executive_summary' | 'detailed_assessment' | 'compliance_report' | 'trend_analysis'
  generatedAt: Date
  generatedBy: string
  organizationId: string
  data: any
  format: 'pdf' | 'excel' | 'json'
  recipients: string[]
  status: 'generating' | 'ready' | 'delivered' | 'archived'
}

// API response types
export interface RiskApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    hasMore?: boolean
  }
}

// Risk matrix configuration
export interface RiskMatrixConfig {
  impactLevels: Array<{
    level: number
    label: string
    description: string
    color: string
  }>
  likelihoodLevels: Array<{
    level: number
    label: string
    description: string
  }>
  riskLevels: Array<{
    level: 'low' | 'medium' | 'high' | 'critical'
    minScore: number
    maxScore: number
    color: string
    action: string
  }>
}

// Risk workflow types
export interface RiskWorkflow {
  id: string
  name: string
  description: string
  steps: RiskWorkflowStep[]
  triggers: RiskWorkflowTrigger[]
  status: 'active' | 'inactive' | 'draft'
}

export interface RiskWorkflowStep {
  id: string
  workflowId: string
  name: string
  description: string
  assignee: string
  dueInDays: number
  required: boolean
  order: number
  actions: string[]
}

export interface RiskWorkflowTrigger {
  id: string
  workflowId: string
  type: 'risk_level_change' | 'due_date_approaching' | 'manual' | 'scheduled'
  conditions: Record<string, any>
  enabled: boolean
}