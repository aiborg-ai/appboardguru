/**
 * Attribute-Based Access Control (ABAC) Types
 * Advanced security framework for fine-grained access control
 */

// Core ABAC Attribute Types
export interface Subject {
  id: string
  type: 'user' | 'service' | 'system'
  attributes: SubjectAttributes
}

export interface SubjectAttributes {
  userId?: string
  role: string
  organizationId?: string
  organizationRole?: string
  department?: string
  clearanceLevel?: number
  securityTags?: string[]
  sessionId?: string
  authenticationMethod?: string
  mfaVerified?: boolean
  deviceFingerprint?: string
  geolocation?: {
    country: string
    region: string
    city: string
    trusted: boolean
  }
  timeZone?: string
  lastLoginAt?: Date
  failedLoginCount?: number
  accountStatus?: 'active' | 'suspended' | 'locked' | 'pending'
  permissions?: string[]
  groups?: string[]
  customAttributes?: Record<string, unknown>
}

export interface Resource {
  id: string
  type: string
  attributes: ResourceAttributes
}

export interface ResourceAttributes {
  resourceId: string
  resourceType: string
  organizationId?: string
  ownerId?: string
  classification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
  sensitivity?: 'low' | 'medium' | 'high' | 'critical'
  categories?: string[]
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: Date
  modifiedAt?: Date
  version?: number
  size?: number
  location?: string
  encryptionStatus?: 'none' | 'at_rest' | 'in_transit' | 'end_to_end'
  accessHistory?: AccessHistoryEntry[]
  retentionPolicy?: string
  legalHold?: boolean
  complianceLabels?: string[]
  parentResource?: string
  childResources?: string[]
  customAttributes?: Record<string, unknown>
}

export interface AccessHistoryEntry {
  userId: string
  action: string
  timestamp: Date
  result: 'granted' | 'denied'
  riskScore?: number
}

export interface Action {
  type: string
  attributes: ActionAttributes
}

export interface ActionAttributes {
  action: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  bulk?: boolean
  scope?: 'self' | 'organization' | 'global'
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  businessJustification?: string
  dataVolume?: 'single' | 'batch' | 'bulk' | 'mass'
  exportFormat?: string
  customAttributes?: Record<string, unknown>
}

export interface Environment {
  attributes: EnvironmentAttributes
}

export interface EnvironmentAttributes {
  timestamp: Date
  requestId: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'api'
  network?: 'internal' | 'external' | 'vpn' | 'mobile'
  timeOfDay?: 'business_hours' | 'after_hours' | 'weekend' | 'holiday'
  geolocation?: {
    country: string
    region: string
    city: string
    trusted: boolean
  }
  threatLevel?: 'low' | 'medium' | 'high' | 'critical'
  anomalyScore?: number
  riskFactors?: string[]
  complianceContext?: string[]
  businessContext?: {
    department?: string
    project?: string
    costCenter?: string
  }
  technicalContext?: {
    applicationVersion?: string
    platform?: string
    browser?: string
  }
  customAttributes?: Record<string, unknown>
}

// Policy Types
export interface ABACPolicy {
  id: string
  name: string
  description: string
  version: string
  status: 'active' | 'inactive' | 'draft' | 'archived'
  priority: number
  target: PolicyTarget
  rules: PolicyRule[]
  obligations?: Obligation[]
  advice?: Advice[]
  metadata: PolicyMetadata
}

export interface PolicyTarget {
  subjects?: AttributeMatch[]
  resources?: AttributeMatch[]
  actions?: AttributeMatch[]
  environments?: AttributeMatch[]
}

export interface AttributeMatch {
  attribute: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'regex' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'exists' | 'not_exists'
  value: unknown
  ignoreCase?: boolean
}

export interface PolicyRule {
  id: string
  effect: 'permit' | 'deny'
  description?: string
  condition?: LogicalExpression
  target?: PolicyTarget
}

export interface LogicalExpression {
  operator: 'and' | 'or' | 'not'
  operands: (AttributeMatch | LogicalExpression)[]
}

export interface Obligation {
  id: string
  type: 'log' | 'notify' | 'encrypt' | 'audit' | 'approve' | 'custom'
  parameters: Record<string, unknown>
  fulfillmentOn: 'permit' | 'deny' | 'both'
}

export interface Advice {
  id: string
  type: 'warning' | 'info' | 'recommendation'
  message: string
  parameters?: Record<string, unknown>
}

export interface PolicyMetadata {
  createdBy: string
  createdAt: Date
  modifiedBy?: string
  modifiedAt?: Date
  tags?: string[]
  category?: string
  compliance?: string[]
  businessOwner?: string
  technicalOwner?: string
  reviewDate?: Date
  expirationDate?: Date
  customMetadata?: Record<string, unknown>
}

// Decision Types
export interface AccessRequest {
  subject: Subject
  resource: Resource
  action: Action
  environment: Environment
  context?: RequestContext
}

export interface RequestContext {
  correlationId?: string
  parentRequestId?: string
  businessJustification?: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  deadline?: Date
  approvals?: Approval[]
  riskAssessment?: RiskAssessment
  complianceRequirements?: string[]
  customContext?: Record<string, unknown>
}

export interface Approval {
  approverId: string
  status: 'pending' | 'approved' | 'rejected'
  timestamp?: Date
  comments?: string
  conditions?: string[]
}

export interface RiskAssessment {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  mitigations?: string[]
  acceptableRiskThreshold?: number
}

export interface RiskFactor {
  type: string
  description: string
  impact: number
  likelihood: number
  weight: number
}

export interface AccessDecision {
  decision: 'permit' | 'deny' | 'not_applicable' | 'indeterminate'
  confidence: number
  riskScore: number
  reasons: DecisionReason[]
  appliedPolicies: string[]
  obligations: Obligation[]
  advice: Advice[]
  metadata: DecisionMetadata
}

export interface DecisionReason {
  type: 'policy' | 'rule' | 'condition' | 'attribute' | 'risk' | 'compliance'
  description: string
  policyId?: string
  ruleId?: string
  severity: 'info' | 'warning' | 'error'
  details?: Record<string, unknown>
}

export interface DecisionMetadata {
  requestId: string
  timestamp: Date
  evaluationTime: number
  evaluatedPolicies: number
  cacheHit?: boolean
  version: string
  correlationId?: string
  customMetadata?: Record<string, unknown>
}

// Policy Management Types
export interface PolicySet {
  id: string
  name: string
  description: string
  policies: string[]
  combiningAlgorithm: 'deny_overrides' | 'permit_overrides' | 'first_applicable' | 'only_one_applicable'
  metadata: PolicyMetadata
}

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  template: Partial<ABACPolicy>
  parameters: TemplateParameter[]
  examples: PolicyExample[]
}

export interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  defaultValue?: unknown
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    minimum?: number
    maximum?: number
    enum?: unknown[]
  }
}

export interface PolicyExample {
  name: string
  description: string
  parameters: Record<string, unknown>
  expectedResult: 'permit' | 'deny'
}

// Testing and Simulation Types
export interface PolicyTest {
  id: string
  name: string
  description: string
  policyId?: string
  policySetId?: string
  testCases: TestCase[]
  createdBy: string
  createdAt: Date
}

export interface TestCase {
  id: string
  name: string
  description: string
  request: AccessRequest
  expectedDecision: 'permit' | 'deny' | 'not_applicable' | 'indeterminate'
  expectedObligations?: string[]
  expectedAdvice?: string[]
  tags?: string[]
}

export interface TestResult {
  testCaseId: string
  actual: AccessDecision
  expected: Partial<AccessDecision>
  passed: boolean
  errors: string[]
  warnings: string[]
  executionTime: number
}

export interface PolicyAnalysis {
  policyId: string
  coverage: {
    subjectAttributes: string[]
    resourceAttributes: string[]
    actionAttributes: string[]
    environmentAttributes: string[]
  }
  conflicts: PolicyConflict[]
  gaps: PolicyGap[]
  redundancies: PolicyRedundancy[]
  complexity: {
    ruleCount: number
    conditionDepth: number
    attributeCount: number
    cyclomaticComplexity: number
  }
}

export interface PolicyConflict {
  type: 'permit_deny' | 'overlapping_rules' | 'contradictory_conditions'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  policies: string[]
  rules: string[]
  recommendation: string
}

export interface PolicyGap {
  type: 'missing_rule' | 'uncovered_scenario' | 'insufficient_granularity'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  scenarios: string[]
  recommendation: string
}

export interface PolicyRedundancy {
  type: 'duplicate_rule' | 'subsumed_rule' | 'unnecessary_condition'
  description: string
  policies: string[]
  rules: string[]
  recommendation: string
}

// Performance and Caching Types
export interface EvaluationMetrics {
  requestId: string
  timestamp: Date
  evaluationTime: number
  policiesEvaluated: number
  rulesEvaluated: number
  attributeResolutions: number
  cacheHits: number
  cacheMisses: number
  memoryUsage?: number
  cpuUsage?: number
}

export interface CacheEntry {
  key: string
  value: AccessDecision
  timestamp: Date
  ttl: number
  hitCount: number
  accessPattern: 'read_only' | 'read_write' | 'write_heavy'
}

// Integration Types
export interface ABACConfiguration {
  pdp: {
    endpoint: string
    timeout: number
    retries: number
    circuitBreaker: {
      enabled: boolean
      threshold: number
      timeout: number
    }
  }
  pip: {
    sources: AttributeSource[]
    cache: {
      enabled: boolean
      ttl: number
      maxSize: number
    }
  }
  pap: {
    repository: {
      type: 'database' | 'file' | 'remote'
      configuration: Record<string, unknown>
    }
    versioning: {
      enabled: boolean
      strategy: 'semantic' | 'timestamp' | 'sequential'
    }
  }
  pep: {
    mode: 'enforcing' | 'permissive' | 'disabled'
    obligations: {
      enabled: boolean
      async: boolean
      timeout: number
    }
  }
  audit: {
    enabled: boolean
    level: 'minimal' | 'standard' | 'comprehensive'
    destination: 'database' | 'file' | 'siem' | 'multiple'
  }
}

export interface AttributeSource {
  id: string
  name: string
  type: 'database' | 'ldap' | 'api' | 'cache' | 'static'
  configuration: Record<string, unknown>
  priority: number
  timeout: number
  fallback?: string
}

// Error Types
export interface ABACError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: Date
  correlationId?: string
}

// Branded types for type safety
export type PolicyId = string & { readonly _brand: 'PolicyId' }
export type RuleId = string & { readonly _brand: 'RuleId' }
export type RequestId = string & { readonly _brand: 'RequestId' }
export type SubjectId = string & { readonly _brand: 'SubjectId' }
export type ResourceId = string & { readonly _brand: 'ResourceId' }

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type AttributePath = string
export type AttributeValue = unknown
export type PolicyExpression = string

// Function signature types
export type AttributeResolver = (path: AttributePath, context: AccessRequest) => Promise<AttributeValue>
export type PolicyEvaluator = (policy: ABACPolicy, request: AccessRequest) => Promise<AccessDecision>
export type ObligationHandler = (obligation: Obligation, context: AccessRequest) => Promise<void>
export type DecisionCombiner = (decisions: AccessDecision[]) => AccessDecision