/**
 * Compliance Tracker Types
 * Comprehensive types for tracking compliance across frameworks, policies, and assessments
 */

export type ComplianceStatus = 'compliant' | 'non-compliant' | 'partially-compliant' | 'under-review' | 'not-assessed'
export type CompliancePriority = 'critical' | 'high' | 'medium' | 'low'
export type ComplianceFrameworkType = 'sox' | 'gdpr' | 'hipaa' | 'iso27001' | 'coso' | 'custom'
export type AssessmentType = 'self-assessment' | 'internal-audit' | 'external-audit' | 'management-review'
export type RemediationStatus = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled'

export interface ComplianceFramework {
  id: string
  name: string
  type: ComplianceFrameworkType
  description: string
  version: string
  effectiveDate: string
  requirements: ComplianceRequirement[]
  organizationId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ComplianceRequirement {
  id: string
  frameworkId: string
  code: string
  title: string
  description: string
  category: string
  priority: CompliancePriority
  controlObjectives: string[]
  evidenceRequired: string[]
  testingProcedures: string[]
  parentRequirementId?: string
  subRequirements?: ComplianceRequirement[]
  applicableRoles: string[]
  frequency: 'continuous' | 'monthly' | 'quarterly' | 'annually' | 'as-needed'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ComplianceAssessment {
  id: string
  name: string
  type: AssessmentType
  frameworkId: string
  scope: string[]
  status: 'draft' | 'in-progress' | 'completed' | 'approved' | 'rejected'
  assessor: {
    id: string
    name: string
    role: string
    certifications?: string[]
  }
  startDate: string
  targetCompletionDate: string
  actualCompletionDate?: string
  overallRating: ComplianceStatus
  findings: ComplianceFinding[]
  recommendations: string[]
  organizationId: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ComplianceFinding {
  id: string
  assessmentId: string
  requirementId: string
  title: string
  description: string
  severity: CompliancePriority
  status: ComplianceStatus
  evidence: Evidence[]
  deficiencies: string[]
  recommendations: string[]
  remediationPlan?: RemediationPlan
  assignedTo?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface Evidence {
  id: string
  type: 'document' | 'screenshot' | 'report' | 'interview' | 'observation' | 'system-log'
  name: string
  description: string
  fileUrl?: string
  metadata: Record<string, any>
  collectedBy: string
  collectedAt: string
  expiryDate?: string
}

export interface RemediationPlan {
  id: string
  findingId: string
  title: string
  description: string
  actions: RemediationAction[]
  assignedTo: string
  priority: CompliancePriority
  targetDate: string
  status: RemediationStatus
  progress: number
  budget?: number
  resources: string[]
  dependencies: string[]
  createdAt: string
  updatedAt: string
}

export interface RemediationAction {
  id: string
  title: string
  description: string
  assignedTo: string
  dueDate: string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  progress: number
  notes: string[]
  completedAt?: string
}

export interface CompliancePolicy {
  id: string
  name: string
  version: string
  category: string
  description: string
  content: string
  applicableFrameworks: string[]
  applicableRoles: string[]
  approver: string
  effectiveDate: string
  reviewDate: string
  nextReviewDate: string
  status: 'draft' | 'under-review' | 'approved' | 'archived' | 'superseded'
  attachments: PolicyAttachment[]
  organizationId: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface PolicyAttachment {
  id: string
  name: string
  type: string
  fileUrl: string
  size: number
  uploadedBy: string
  uploadedAt: string
}

export interface ComplianceMetrics {
  overallComplianceScore: number
  frameworkScores: Record<string, number>
  trendsOverTime: {
    period: string
    score: number
    totalRequirements: number
    compliantRequirements: number
  }[]
  riskDistribution: Record<CompliancePriority, number>
  upcomingDeadlines: {
    type: 'assessment' | 'remediation' | 'policy-review'
    item: string
    dueDate: string
    daysRemaining: number
    priority: CompliancePriority
  }[]
  topRisks: {
    requirement: string
    framework: string
    riskLevel: CompliancePriority
    lastAssessed: string
    status: ComplianceStatus
  }[]
}

export interface ComplianceAlert {
  id: string
  type: 'deadline-approaching' | 'overdue-remediation' | 'new-requirement' | 'compliance-breach' | 'review-required'
  title: string
  message: string
  priority: CompliancePriority
  relatedEntity: {
    type: 'assessment' | 'requirement' | 'remediation' | 'policy'
    id: string
    name: string
  }
  assignedTo?: string
  isRead: boolean
  dueDate?: string
  createdAt: string
  organizationId: string
}

export interface ComplianceReport {
  id: string
  name: string
  type: 'executive-summary' | 'detailed-assessment' | 'remediation-status' | 'framework-compliance' | 'custom'
  scope: {
    frameworks: string[]
    dateRange: {
      start: string
      end: string
    }
    includeRemediation: boolean
    includeMetrics: boolean
  }
  format: 'pdf' | 'excel' | 'csv'
  generatedBy: string
  generatedAt: string
  fileUrl?: string
  status: 'generating' | 'completed' | 'failed'
  organizationId: string
}

export interface ComplianceWorkflow {
  id: string
  name: string
  type: 'assessment-approval' | 'remediation-approval' | 'policy-review' | 'finding-resolution'
  steps: WorkflowStep[]
  currentStep: number
  status: 'pending' | 'in-progress' | 'completed' | 'rejected' | 'cancelled'
  entityId: string
  entityType: 'assessment' | 'remediation' | 'policy' | 'finding'
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowStep {
  id: string
  order: number
  name: string
  assignedTo: string
  action: 'review' | 'approve' | 'reject' | 'comment' | 'assign'
  status: 'pending' | 'completed' | 'skipped'
  completedBy?: string
  completedAt?: string
  comments?: string
}

// API Request/Response Types
export interface CreateAssessmentRequest {
  name: string
  type: AssessmentType
  frameworkId: string
  scope: string[]
  assessorId: string
  targetCompletionDate: string
}

export interface UpdateAssessmentRequest {
  name?: string
  status?: ComplianceAssessment['status']
  overallRating?: ComplianceStatus
  findings?: Partial<ComplianceFinding>[]
  recommendations?: string[]
  actualCompletionDate?: string
}

export interface CreateRemediationRequest {
  findingId: string
  title: string
  description: string
  actions: Omit<RemediationAction, 'id'>[]
  assignedTo: string
  priority: CompliancePriority
  targetDate: string
  budget?: number
  resources: string[]
}

export interface ComplianceSearchFilters {
  frameworks?: string[]
  status?: ComplianceStatus[]
  priority?: CompliancePriority[]
  assignedTo?: string[]
  dateRange?: {
    start: string
    end: string
  }
  categories?: string[]
  assessmentTypes?: AssessmentType[]
}

export interface ComplianceDashboardData {
  summary: {
    totalFrameworks: number
    activeAssessments: number
    openFindings: number
    overdueTasks: number
  }
  metrics: ComplianceMetrics
  recentActivity: {
    type: 'assessment' | 'finding' | 'remediation' | 'policy'
    title: string
    status: string
    date: string
    user: string
  }[]
  alerts: ComplianceAlert[]
}