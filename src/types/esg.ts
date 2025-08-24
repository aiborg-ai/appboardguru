import type { UserId, OrganizationId } from './branded'

// ESG Framework Types
export type ESGFramework = 'GRI' | 'SASB' | 'TCFD' | 'CDP' | 'DJSI' | 'MSCI' | 'Custom'

// ESG Categories
export type ESGCategory = 'Environmental' | 'Social' | 'Governance'

export interface ESGMetric {
  id: string
  category: ESGCategory
  subcategory: string
  name: string
  description: string
  unit: string
  target?: number
  weight: number
  framework: ESGFramework[]
  dataSource?: string
  calculationMethod?: string
  reportingFrequency: 'Monthly' | 'Quarterly' | 'Annually'
  isRequired: boolean
  tags: string[]
}

export interface ESGDataPoint {
  id: string
  metricId: string
  organizationId: OrganizationId
  value: number
  period: string // YYYY-MM format
  unit: string
  dataSource: string
  verificationStatus: 'Unverified' | 'Internal' | 'External' | 'Certified'
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: UserId
}

export interface ESGScore {
  id: string
  organizationId: OrganizationId
  category: ESGCategory
  subcategory?: string
  score: number
  maxScore: number
  percentile: number
  period: string
  framework: ESGFramework
  calculatedAt: string
  breakdown: ESGScoreBreakdown[]
}

export interface ESGScoreBreakdown {
  metricId: string
  metricName: string
  weight: number
  rawValue: number
  normalizedScore: number
  contribution: number
}

export interface ESGScorecard {
  id: string
  organizationId: OrganizationId
  period: string
  framework: ESGFramework
  overallScore: number
  overallRating: ESGRating
  environmentalScore: number
  socialScore: number
  governanceScore: number
  scores: ESGScore[]
  benchmarks: ESGBenchmark[]
  trends: ESGTrend[]
  risks: ESGRisk[]
  opportunities: ESGOpportunity[]
  recommendations: ESGRecommendation[]
  createdAt: string
  updatedAt: string
  status: 'Draft' | 'In Review' | 'Approved' | 'Published'
}

export type ESGRating = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F'

export interface ESGBenchmark {
  category: ESGCategory
  metric: string
  organizationScore: number
  industryAverage: number
  industryMedian: number
  topQuartile: number
  bestInClass: number
  percentileRank: number
}

export interface ESGTrend {
  category: ESGCategory
  metric: string
  currentValue: number
  previousValue: number
  changePercent: number
  trend: 'Improving' | 'Stable' | 'Declining'
  periods: ESGTrendDataPoint[]
}

export interface ESGTrendDataPoint {
  period: string
  value: number
}

export interface ESGRisk {
  id: string
  category: ESGCategory
  title: string
  description: string
  impact: 'Low' | 'Medium' | 'High' | 'Critical'
  likelihood: 'Low' | 'Medium' | 'High'
  riskScore: number
  mitigation: string[]
  owner?: string
  dueDate?: string
  status: 'Identified' | 'Assessing' | 'Mitigating' | 'Monitoring' | 'Resolved'
}

export interface ESGOpportunity {
  id: string
  category: ESGCategory
  title: string
  description: string
  potentialImpact: 'Low' | 'Medium' | 'High'
  effort: 'Low' | 'Medium' | 'High'
  timeframe: 'Short' | 'Medium' | 'Long'
  estimatedValue?: number
  actionItems: string[]
  owner?: string
  status: 'Identified' | 'Planning' | 'In Progress' | 'Implemented' | 'Closed'
}

export interface ESGRecommendation {
  id: string
  category: ESGCategory
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  title: string
  description: string
  rationale: string
  expectedImpact: string
  implementation: ESGImplementationPlan
  timeline: string
  resources: string[]
  successMetrics: string[]
  status: 'Pending' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected'
}

export interface ESGImplementationPlan {
  phases: ESGImplementationPhase[]
  totalCost?: number
  totalDuration?: string
  dependencies: string[]
  risks: string[]
}

export interface ESGImplementationPhase {
  name: string
  duration: string
  tasks: string[]
  deliverables: string[]
  milestones: string[]
}

// ESG Settings and Configuration
export interface ESGConfiguration {
  organizationId: OrganizationId
  framework: ESGFramework[]
  reportingPeriod: 'Monthly' | 'Quarterly' | 'Annually'
  industryBenchmarks: boolean
  peerComparison: boolean
  enabledCategories: ESGCategory[]
  customMetrics: ESGMetric[]
  weightings: ESGWeighting[]
  dataQualityThresholds: ESGDataQuality
  notificationSettings: ESGNotificationSettings
}

export interface ESGWeighting {
  category: ESGCategory
  weight: number
  subcategoryWeights?: { [key: string]: number }
}

export interface ESGDataQuality {
  minimumVerificationLevel: 'Unverified' | 'Internal' | 'External' | 'Certified'
  dataFreshnessThreshold: number // days
  completenessThreshold: number // percentage
}

export interface ESGNotificationSettings {
  scoreUpdates: boolean
  benchmarkChanges: boolean
  riskAlerts: boolean
  opportunityAlerts: boolean
  reportingDeadlines: boolean
  dataQualityIssues: boolean
}

// ESG Analytics and Insights
export interface ESGAnalytics {
  organizationId: OrganizationId
  period: string
  performanceSummary: ESGPerformanceSummary
  industryComparison: ESGIndustryComparison
  trendAnalysis: ESGTrendAnalysis
  materialityAssessment: ESGMaterialityItem[]
  riskHeatMap: ESGRiskHeatMap
  opportunityMatrix: ESGOpportunityMatrix
}

export interface ESGPerformanceSummary {
  overallImprovement: number
  categoryImprovements: { [K in ESGCategory]: number }
  topPerformingMetrics: string[]
  underperformingMetrics: string[]
  achievedTargets: number
  totalTargets: number
}

export interface ESGIndustryComparison {
  industryCode: string
  industryName: string
  organizationRank: number
  totalOrganizations: number
  percentile: number
  categoryComparisons: { [K in ESGCategory]: ESGCategoryComparison }
}

export interface ESGCategoryComparison {
  score: number
  industryAverage: number
  industryMedian: number
  rank: number
  percentile: number
}

export interface ESGTrendAnalysis {
  overallTrend: 'Improving' | 'Stable' | 'Declining'
  categoryTrends: { [K in ESGCategory]: 'Improving' | 'Stable' | 'Declining' }
  acceleratingMetrics: string[]
  decliningMetrics: string[]
  volatileMetrics: string[]
}

export interface ESGMaterialityItem {
  issue: string
  category: ESGCategory
  businessImpact: number
  stakeholderConcern: number
  materialityScore: number
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
}

export interface ESGRiskHeatMap {
  items: ESGRiskHeatMapItem[]
  totalRiskScore: number
  riskDistribution: { [key: string]: number }
}

export interface ESGRiskHeatMapItem {
  risk: string
  category: ESGCategory
  impact: number
  likelihood: number
  riskScore: number
  position: { x: number; y: number }
}

export interface ESGOpportunityMatrix {
  items: ESGOpportunityMatrixItem[]
  totalValue: number
  quickWins: ESGOpportunityMatrixItem[]
  strategicBets: ESGOpportunityMatrixItem[]
}

export interface ESGOpportunityMatrixItem {
  opportunity: string
  category: ESGCategory
  impact: number
  effort: number
  value: number
  position: { x: number; y: number }
}

// ESG Reporting
export interface ESGReport {
  id: string
  organizationId: OrganizationId
  type: 'Scorecard' | 'Sustainability' | 'Impact' | 'Compliance' | 'Custom'
  framework: ESGFramework[]
  period: string
  title: string
  description: string
  sections: ESGReportSection[]
  metadata: ESGReportMetadata
  status: 'Draft' | 'In Review' | 'Approved' | 'Published'
  createdAt: string
  updatedAt: string
  createdBy: UserId
}

export interface ESGReportSection {
  id: string
  title: string
  type: 'Executive Summary' | 'Performance' | 'Metrics' | 'Benchmarks' | 'Trends' | 'Risks' | 'Opportunities' | 'Action Plan' | 'Custom'
  content: ESGReportContent
  order: number
}

export interface ESGReportContent {
  text?: string
  charts?: ESGChart[]
  tables?: ESGTable[]
  metrics?: string[]
  insights?: string[]
}

export interface ESGChart {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap'
  data: any[]
  config: any
  title: string
  description?: string
}

export interface ESGTable {
  headers: string[]
  rows: (string | number)[][]
  title: string
  description?: string
}

export interface ESGReportMetadata {
  version: string
  language: string
  audience: string[]
  distribution: string[]
  confidentiality: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
  tags: string[]
}

// UI Component Props
export interface ESGScorecardProps {
  organizationId: OrganizationId
  period?: string
  framework?: ESGFramework
  onPeriodChange?: (period: string) => void
  onFrameworkChange?: (framework: ESGFramework) => void
}

export interface ESGMetricsProps {
  organizationId: OrganizationId
  category?: ESGCategory
  editable?: boolean
  onMetricUpdate?: (metricId: string, value: number) => void
}

export interface ESGBenchmarkProps {
  organizationId: OrganizationId
  category?: ESGCategory
  showIndustry?: boolean
  showPeers?: boolean
}

export interface ESGTrendsProps {
  organizationId: OrganizationId
  metric?: string
  timeRange?: string
}