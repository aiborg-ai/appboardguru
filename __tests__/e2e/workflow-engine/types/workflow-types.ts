/**
 * Workflow Types
 * 
 * Type definitions for workflow testing engine components.
 */

export interface MeetingLifecycleStage {
  stage: 'pre_meeting' | 'live_meeting' | 'post_meeting'
  phase: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  metadata?: any
}

export interface WorkflowValidationResult {
  passed: boolean
  score: number
  validations: ValidationResult[]
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface ValidationResult {
  category: string
  test: string
  passed: boolean
  score: number
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  details?: any
}

export interface WorkflowIntegrationPoint {
  sourceSystem: 'meetings' | 'ai' | 'voting' | 'compliance'
  targetSystem: 'meetings' | 'ai' | 'voting' | 'compliance'
  dataFlow: 'bidirectional' | 'unidirectional'
  syncType: 'real_time' | 'batch' | 'event_driven'
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  id: string
  description: string
  condition: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  autoCorrect?: boolean
}

export interface WorkflowExecutionContext {
  workflowId: string
  scenarioType: string
  participants: ParticipantContext[]
  systemIntegrations: WorkflowIntegrationPoint[]
  performanceRequirements: PerformanceRequirements
  complianceRequirements: string[]
}

export interface ParticipantContext {
  userId: string
  role: string
  permissions: string[]
  context: any // BrowserContext
  pages: any[] // Page[]
  state: any
}

export interface PerformanceRequirements {
  maxResponseTime: number
  maxMemoryUsage: number
  maxErrorRate: number
  minThroughput: number
  concurrentUsers: number
}

export interface WorkflowTestReport {
  workflowId: string
  scenarioType: string
  executionTime: {
    start: string
    end: string
    durationMs: number
  }
  validationResults: WorkflowValidationResult
  performanceMetrics: any
  integrationResults: any
  complianceResults: any
  recommendations: string[]
  artifacts: WorkflowArtifact[]
}

export interface WorkflowArtifact {
  type: 'screenshot' | 'video' | 'log' | 'trace' | 'report'
  path: string
  description: string
  timestamp: number
  size: number
}

export interface SystemIntegrationTest {
  name: string
  sourceSystem: string
  targetSystem: string
  testScenario: string
  validationCriteria: ValidationCriteria[]
  performanceThresholds: PerformanceThresholds
}

export interface ValidationCriteria {
  property: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  expectedValue: any
  actualValue?: any
  passed?: boolean
}

export interface PerformanceThresholds {
  maxResponseTime: number
  maxMemoryUsage: number
  maxCpuUsage: number
  maxErrorRate: number
}

export interface WorkflowDataConsistencyCheck {
  checkName: string
  sourceData: any
  targetData: any
  consistencyRules: ConsistencyRule[]
  passed: boolean
  violations: ConsistencyViolation[]
}

export interface ConsistencyRule {
  id: string
  description: string
  sourceProperty: string
  targetProperty: string
  transformFunction?: string
  toleranceThreshold?: number
}

export interface ConsistencyViolation {
  ruleId: string
  description: string
  sourceValue: any
  targetValue: any
  deviation?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}