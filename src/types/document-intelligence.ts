/**
 * Type definitions for AI Document Intelligence Hub
 */

// ========================================
// CORE DOCUMENT TYPES
// ========================================

export interface DocumentMetadata {
  id: string
  filename: string
  fileType: string
  fileSize: number
  totalPages?: number
  uploadedAt: string
  processed: boolean
  wordCount?: number
  complexity?: number
  organizationId?: string
  uploadedBy?: string
}

export interface VectorEmbedding {
  id: string
  embedding: number[]
  metadata: {
    documentId: string
    chunkId?: string
    createdAt: string
    [key: string]: any
  }
}

// ========================================
// DOCUMENT SUMMARIZATION TYPES
// ========================================

export interface DocumentSummary {
  id: string
  documentId: string
  summaryType: 'executive' | 'detailed' | 'key-insights' | 'action-items' | 'risk-assessment'
  content: string
  keyInsights: string[]
  actionItems: ActionItem[]
  riskFactors: RiskFactor[]
  generatedAt: string
  llmModel: string
  metadata: {
    wordCount: number
    readingTime: number // in minutes
    complexity: number // 1-10 scale
    confidence: number // 0-1 scale
  }
  priorityScore?: number // 1-10 scale
}

export interface ActionItem {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate?: string
  assignedTo?: string
  status: 'pending' | 'in-progress' | 'completed'
  source: {
    page?: number
    section?: string
    quote?: string
  }
}

export interface RiskFactor {
  id: string
  category: 'financial' | 'legal' | 'operational' | 'compliance' | 'strategic'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  likelihood: 'unlikely' | 'possible' | 'likely' | 'very-likely'
  impact: string
  mitigation?: string
  source: {
    page?: number
    section?: string
    quote?: string
  }
}

// ========================================
// RAG Q&A SYSTEM TYPES
// ========================================

export interface DocumentQAResult {
  id: string
  query: string
  answer: string
  citations: Citation[]
  relatedDocuments: string[]
  confidence: number // 0-1 scale
  sources: QASource[]
  generatedAt: string
  conversationId?: string
}

export interface Citation {
  documentId: string
  documentName: string
  page?: number
  section?: string
  quote: string
  relevanceScore: number
}

export interface QASource {
  documentId: string
  page?: number
  section?: string
  relevanceScore: number
}

export interface ConversationHistory {
  id: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    metadata?: any
  }>
  createdAt: string
  updatedAt: string
}

// ========================================
// DOCUMENT ANALYSIS TYPES
// ========================================

export interface DocumentAnalysis {
  id: string
  documentId: string
  analysisTypes: AnalysisType[]
  results: Record<string, any>
  crossAnalysisInsights?: CrossDocumentInsight[]
  riskAssessment?: DocumentRiskAssessment
  complianceResults?: DocumentComplianceResult[]
  confidence: number
  generatedAt: string
}

export type AnalysisType = 'contract' | 'financial' | 'legal' | 'compliance' | 'risk' | 'policy'

export interface ContractAnalysis {
  parties: Party[]
  keyTerms: ContractTerm[]
  obligations: Obligation[]
  paymentTerms: PaymentTerm[]
  terminationClauses: TerminationClause[]
  riskFactors: RiskFactor[]
  complianceRequirements: ComplianceRequirement[]
  recommendations: string[]
}

export interface FinancialAnalysis {
  keyMetrics: FinancialMetric[]
  trends: FinancialTrend[]
  ratios: FinancialRatio[]
  concerns: FinancialConcern[]
  opportunities: FinancialOpportunity[]
  recommendations: string[]
  complianceStatus: ComplianceStatus[]
}

export interface Party {
  name: string
  role: 'client' | 'vendor' | 'contractor' | 'partner' | 'other'
  responsibilities: string[]
}

export interface ContractTerm {
  category: string
  description: string
  importance: 'low' | 'medium' | 'high'
  source: { page?: number; section?: string }
}

export interface Obligation {
  party: string
  description: string
  deadline?: string
  penalty?: string
  status: 'pending' | 'completed' | 'overdue'
}

export interface FinancialMetric {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  significance: 'low' | 'medium' | 'high'
}

// ========================================
// WORKFLOW TYPES
// ========================================

export interface DocumentWorkflowRule {
  id: string
  name: string
  description: string
  triggers: WorkflowTrigger[]
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface WorkflowTrigger {
  type: 'document_upload' | 'document_update' | 'analysis_complete' | 'scheduled'
  conditions: Record<string, any>
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
}

export interface WorkflowAction {
  type: 'notify' | 'route' | 'analyze' | 'approve' | 'archive' | 'tag'
  parameters: Record<string, any>
}

export interface DocumentWorkflowStatus {
  id: string
  documentId: string
  triggerEvent: string
  executedRules: WorkflowExecution[]
  status: 'running' | 'completed' | 'failed' | 'partial'
  startedAt: string
  completedAt?: string
}

export interface WorkflowExecution {
  ruleId: string
  status: 'completed' | 'failed' | 'skipped'
  result?: any
  error?: string
  executedAt: string
}

// ========================================
// SEARCH & DISCOVERY TYPES
// ========================================

export interface SemanticSearchResult {
  documentId: string
  chunkId: string
  similarity: number
  snippet?: string
  metadata: any
  highlights: TextHighlight[]
}

export interface TextHighlight {
  text: string
  startIndex: number
  endIndex: number
  score: number
}

export interface DocumentRelationship {
  sourceDocumentId: string
  targetDocumentId: string
  relationshipType: 'similar' | 'references' | 'supersedes' | 'amends' | 'related'
  strength: number // 0-1 similarity score
  description: string
  discoveredAt: string
}

export interface DocumentCluster {
  id: string
  name: string
  description: string
  documents: string[]
  centerEmbedding: number[]
  coherenceScore: number
  topics: string[]
}

// ========================================
// RISK ASSESSMENT TYPES
// ========================================

export interface DocumentRiskAssessment {
  documentId: string
  overallRiskScore: number // 1-10 scale
  riskCategories: RiskCategory[]
  criticalFindings: CriticalFinding[]
  recommendations: RiskRecommendation[]
  complianceGaps: ComplianceGap[]
  generatedAt: string
}

export interface RiskCategory {
  category: 'financial' | 'legal' | 'operational' | 'compliance' | 'strategic' | 'reputation'
  score: number // 1-10
  factors: RiskFactor[]
  mitigation: string[]
}

export interface CriticalFinding {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  evidence: string
  recommendation: string
  source: { page?: number; section?: string }
}

export interface RiskRecommendation {
  id: string
  priority: 'immediate' | 'high' | 'medium' | 'low'
  description: string
  expectedImpact: string
  implementationComplexity: 'low' | 'medium' | 'high'
  estimatedEffort: string
}

// ========================================
// COMPLIANCE TYPES
// ========================================

export interface DocumentComplianceResult {
  standard: ComplianceStandard
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown'
  score: number // 0-100
  findings: ComplianceFinding[]
  gaps: ComplianceGap[]
  recommendations: string[]
}

export interface ComplianceStandard {
  id: string
  name: string
  category: 'financial' | 'legal' | 'industry' | 'internal'
  requirements: ComplianceRequirement[]
}

export interface ComplianceRequirement {
  id: string
  description: string
  mandatory: boolean
  section?: string
}

export interface ComplianceFinding {
  requirementId: string
  status: 'met' | 'not-met' | 'partial' | 'not-applicable'
  evidence?: string
  source?: { page?: number; section?: string }
}

export interface ComplianceGap {
  requirementId: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  remediation: string
  estimatedEffort: string
}

export interface ComplianceStatus {
  requirement: string
  status: 'compliant' | 'non-compliant' | 'partial'
  details: string
}

// ========================================
// CROSS-DOCUMENT INSIGHTS
// ========================================

export interface CrossDocumentInsight {
  id: string
  type: 'trend' | 'inconsistency' | 'correlation' | 'gap' | 'opportunity'
  title: string
  description: string
  involvedDocuments: string[]
  confidence: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  recommendations?: string[]
  generatedAt: string
}

// ========================================
// ANALYTICS & METRICS TYPES
// ========================================

export interface DocumentIntelligenceMetrics {
  organizationId: string
  timeRange: { start: string; end: string }
  totalDocuments: number
  documentsProcessed: number
  averageProcessingTime: number // in seconds
  
  contentMetrics: {
    totalWords: number
    averageReadingTime: number // in minutes
    complexityDistribution: ComplexityDistribution
    topicDistribution: TopicDistribution[]
  }

  usageMetrics: {
    summariesGenerated: number
    questionsAnswered: number
    searchesPerformed: number
    workflowsExecuted: number
  }

  qualityMetrics: {
    averageConfidenceScore: number
    userSatisfactionScore: number
    accuracyMetrics: AccuracyMetrics
  }

  trends: {
    processingVolumeOverTime: TimeSeriesData[]
    contentTypeTrends: ContentTypeTrend[]
    usageTrends: UsageTrend[]
  }

  generatedAt: string
}

export interface ComplexityDistribution {
  low: number // 1-3
  medium: number // 4-6
  high: number // 7-10
}

export interface TopicDistribution {
  topic: string
  documentCount: number
  percentage: number
}

export interface AccuracyMetrics {
  summaryAccuracy: number
  qaAccuracy: number
  analysisAccuracy: number
  overallAccuracy: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
}

export interface ContentTypeTrend {
  contentType: string
  count: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

export interface UsageTrend {
  feature: string
  usageCount: number
  trend: 'up' | 'down' | 'stable'
  growthRate: number
}

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface AIAnalysisConfig {
  models: {
    summarization: string
    qa: string
    analysis: string
    embedding: string
  }
  parameters: {
    maxTokens: number
    temperature: number
    similarityThreshold: number
    chunkSize: number
    chunkOverlap: number
  }
  features: {
    priorityScoring: boolean
    riskAssessment: boolean
    complianceChecking: boolean
    workflowAutomation: boolean
  }
}

// ========================================
// UTILITY TYPES
// ========================================

export interface ProcessingProgress {
  documentId: string
  stage: 'chunking' | 'embedding' | 'analyzing' | 'summarizing' | 'indexing'
  progress: number // 0-100
  estimatedTimeRemaining?: number // in seconds
  error?: string
}

export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  metadata: {
    page?: number
    section?: string
    type: 'text' | 'table' | 'header' | 'footer' | 'image'
    position?: { x: number; y: number; width: number; height: number }
  }
  embedding?: number[]
  tokens?: number
}

export interface PaymentTerm {
  amount?: number
  currency?: string
  dueDate?: string
  frequency?: string
  penalties?: string
}

export interface TerminationClause {
  conditions: string[]
  noticePeriod?: string
  penalties?: string
  survivingClauses?: string[]
}

export interface FinancialTrend {
  metric: string
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  period: string
}

export interface FinancialRatio {
  name: string
  value: number
  benchmark?: number
  status: 'good' | 'concerning' | 'poor'
}

export interface FinancialConcern {
  category: string
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface FinancialOpportunity {
  category: string
  description: string
  potentialImpact: 'low' | 'medium' | 'high'
  recommendations: string[]
}