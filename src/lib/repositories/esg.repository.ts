import { BaseRepository } from './base.repository'
import { Result } from './result'
import type { TypedSupabaseClient } from '@/types/api'
import type {
  ESGScorecard,
  ESGScore,
  ESGDataPoint,
  ESGMetric,
  ESGConfiguration,
  ESGAnalytics,
  ESGReport,
  ESGRisk,
  ESGOpportunity,
  ESGRecommendation,
  OrganizationId,
  UserId,
  ESGFramework,
  ESGCategory
} from '@/types/esg'

interface ESGScorecardInsert {
  organization_id: string
  period: string
  framework: string
  overall_score: number
  overall_rating: string
  environmental_score: number
  social_score: number
  governance_score: number
  status: string
  created_by?: string
}

interface ESGDataPointInsert {
  metric_id: string
  organization_id: string
  value: number
  period: string
  unit: string
  data_source: string
  verification_status: string
  notes?: string
  created_by: string
}

interface ESGConfigurationInsert {
  organization_id: string
  framework: string[]
  reporting_period: string
  industry_benchmarks: boolean
  peer_comparison: boolean
  enabled_categories: string[]
  custom_metrics: any
  weightings: any
  data_quality_thresholds: any
  notification_settings: any
}

export class ESGRepository extends BaseRepository {
  constructor(supabase: TypedSupabaseClient) {
    super(supabase, 'esg_scorecards')
  }

  // Scorecard Operations
  async createScorecard(scorecardData: ESGScorecardInsert): Promise<Result<ESGScorecard>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_scorecards')
        .insert(scorecardData)
        .select()
        .single()

      if (error) throw error

      return Result.success(this.mapToESGScorecard(data))
    } catch (error) {
      return Result.failure('Failed to create ESG scorecard', error as Error)
    }
  }

  async getScorecardById(id: string): Promise<Result<ESGScorecard>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_scorecards')
        .select(`
          *,
          esg_scores (
            *,
            esg_score_breakdowns (*)
          ),
          esg_benchmarks (*),
          esg_trends (*),
          esg_risks (*),
          esg_opportunities (*),
          esg_recommendations (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return Result.failure('ESG scorecard not found')

      return Result.success(this.mapToESGScorecard(data))
    } catch (error) {
      return Result.failure('Failed to retrieve ESG scorecard', error as Error)
    }
  }

  async getScorecardsByOrganization(
    organizationId: OrganizationId,
    limit = 10,
    offset = 0
  ): Promise<Result<ESGScorecard[]>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_scorecards')
        .select(`
          *,
          esg_scores (*),
          esg_benchmarks (*),
          esg_trends (*)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      const scorecards = (data || []).map(scorecard => this.mapToESGScorecard(scorecard))
      return Result.success(scorecards)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG scorecards', error as Error)
    }
  }

  async getLatestScorecard(
    organizationId: OrganizationId,
    framework?: ESGFramework
  ): Promise<Result<ESGScorecard | null>> {
    try {
      let query = this.supabase
        .from('esg_scorecards')
        .select(`
          *,
          esg_scores (*),
          esg_benchmarks (*),
          esg_trends (*),
          esg_risks (*),
          esg_opportunities (*),
          esg_recommendations (*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'Published')
        .order('period', { ascending: false })

      if (framework) {
        query = query.eq('framework', framework)
      }

      const { data, error } = await query.limit(1).single()

      if (error && error.code !== 'PGRST116') throw error
      if (!data) return Result.success(null)

      return Result.success(this.mapToESGScorecard(data))
    } catch (error) {
      return Result.failure('Failed to retrieve latest ESG scorecard', error as Error)
    }
  }

  // Data Point Operations
  async createDataPoint(dataPointData: ESGDataPointInsert): Promise<Result<ESGDataPoint>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_data_points')
        .insert(dataPointData)
        .select()
        .single()

      if (error) throw error

      return Result.success(this.mapToESGDataPoint(data))
    } catch (error) {
      return Result.failure('Failed to create ESG data point', error as Error)
    }
  }

  async getDataPointsByMetric(
    metricId: string,
    organizationId: OrganizationId,
    startPeriod?: string,
    endPeriod?: string
  ): Promise<Result<ESGDataPoint[]>> {
    try {
      let query = this.supabase
        .from('esg_data_points')
        .select('*')
        .eq('metric_id', metricId)
        .eq('organization_id', organizationId)
        .order('period', { ascending: true })

      if (startPeriod) {
        query = query.gte('period', startPeriod)
      }

      if (endPeriod) {
        query = query.lte('period', endPeriod)
      }

      const { data, error } = await query

      if (error) throw error

      const dataPoints = (data || []).map(point => this.mapToESGDataPoint(point))
      return Result.success(dataPoints)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG data points', error as Error)
    }
  }

  async updateDataPoint(
    id: string,
    updates: Partial<ESGDataPointInsert>
  ): Promise<Result<ESGDataPoint>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_data_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return Result.success(this.mapToESGDataPoint(data))
    } catch (error) {
      return Result.failure('Failed to update ESG data point', error as Error)
    }
  }

  // Metrics Operations
  async getMetrics(framework?: ESGFramework, category?: ESGCategory): Promise<Result<ESGMetric[]>> {
    try {
      let query = this.supabase
        .from('esg_metrics')
        .select('*')
        .order('category')
        .order('subcategory')
        .order('name')

      if (framework) {
        query = query.contains('framework', [framework])
      }

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error

      const metrics = (data || []).map(metric => this.mapToESGMetric(metric))
      return Result.success(metrics)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG metrics', error as Error)
    }
  }

  async createCustomMetric(metricData: Omit<ESGMetric, 'id'>): Promise<Result<ESGMetric>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_metrics')
        .insert({
          category: metricData.category,
          subcategory: metricData.subcategory,
          name: metricData.name,
          description: metricData.description,
          unit: metricData.unit,
          target: metricData.target,
          weight: metricData.weight,
          framework: metricData.framework,
          data_source: metricData.dataSource,
          calculation_method: metricData.calculationMethod,
          reporting_frequency: metricData.reportingFrequency,
          is_required: metricData.isRequired,
          tags: metricData.tags,
          is_custom: true
        })
        .select()
        .single()

      if (error) throw error

      return Result.success(this.mapToESGMetric(data))
    } catch (error) {
      return Result.failure('Failed to create custom ESG metric', error as Error)
    }
  }

  // Configuration Operations
  async getConfiguration(organizationId: OrganizationId): Promise<Result<ESGConfiguration | null>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (!data) return Result.success(null)

      return Result.success(this.mapToESGConfiguration(data))
    } catch (error) {
      return Result.failure('Failed to retrieve ESG configuration', error as Error)
    }
  }

  async updateConfiguration(
    organizationId: OrganizationId,
    configData: ESGConfigurationInsert
  ): Promise<Result<ESGConfiguration>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_configurations')
        .upsert({
          ...configData,
          organization_id: organizationId
        })
        .select()
        .single()

      if (error) throw error

      return Result.success(this.mapToESGConfiguration(data))
    } catch (error) {
      return Result.failure('Failed to update ESG configuration', error as Error)
    }
  }

  // Analytics Operations
  async getAnalytics(
    organizationId: OrganizationId,
    period: string
  ): Promise<Result<ESGAnalytics>> {
    try {
      // This would typically aggregate data from multiple tables
      // For now, return a placeholder structure
      const analytics: ESGAnalytics = {
        organizationId,
        period,
        performanceSummary: {
          overallImprovement: 5.2,
          categoryImprovements: {
            Environmental: 7.1,
            Social: 3.8,
            Governance: 4.7
          },
          topPerformingMetrics: ['Carbon Emissions', 'Employee Satisfaction'],
          underperformingMetrics: ['Water Usage', 'Board Diversity'],
          achievedTargets: 8,
          totalTargets: 12
        },
        industryComparison: {
          industryCode: 'TECH',
          industryName: 'Technology',
          organizationRank: 15,
          totalOrganizations: 247,
          percentile: 85,
          categoryComparisons: {
            Environmental: {
              score: 78.5,
              industryAverage: 65.2,
              industryMedian: 67.8,
              rank: 12,
              percentile: 88
            },
            Social: {
              score: 82.1,
              industryAverage: 72.4,
              industryMedian: 75.1,
              rank: 18,
              percentile: 82
            },
            Governance: {
              score: 91.3,
              industryAverage: 81.7,
              industryMedian: 83.2,
              rank: 8,
              percentile: 94
            }
          }
        },
        trendAnalysis: {
          overallTrend: 'Improving',
          categoryTrends: {
            Environmental: 'Improving',
            Social: 'Stable',
            Governance: 'Improving'
          },
          acceleratingMetrics: ['Renewable Energy Usage', 'Employee Training Hours'],
          decliningMetrics: ['Waste Generation'],
          volatileMetrics: ['Supply Chain Emissions']
        },
        materialityAssessment: [],
        riskHeatMap: {
          items: [],
          totalRiskScore: 0,
          riskDistribution: {}
        },
        opportunityMatrix: {
          items: [],
          totalValue: 0,
          quickWins: [],
          strategicBets: []
        }
      }

      return Result.success(analytics)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG analytics', error as Error)
    }
  }

  // Risk and Opportunity Operations
  async getRisksByOrganization(organizationId: OrganizationId): Promise<Result<ESGRisk[]>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_risks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('risk_score', { ascending: false })

      if (error) throw error

      const risks = (data || []).map(risk => this.mapToESGRisk(risk))
      return Result.success(risks)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG risks', error as Error)
    }
  }

  async getOpportunitiesByOrganization(organizationId: OrganizationId): Promise<Result<ESGOpportunity[]>> {
    try {
      const { data, error } = await this.supabase
        .from('esg_opportunities')
        .select('*')
        .eq('organization_id', organizationId)
        .order('potential_impact', { ascending: false })

      if (error) throw error

      const opportunities = (data || []).map(opportunity => this.mapToESGOpportunity(opportunity))
      return Result.success(opportunities)
    } catch (error) {
      return Result.failure('Failed to retrieve ESG opportunities', error as Error)
    }
  }

  // Mapping functions
  private mapToESGScorecard(data: any): ESGScorecard {
    return {
      id: data.id,
      organizationId: data.organization_id,
      period: data.period,
      framework: data.framework,
      overallScore: data.overall_score,
      overallRating: data.overall_rating,
      environmentalScore: data.environmental_score,
      socialScore: data.social_score,
      governanceScore: data.governance_score,
      scores: (data.esg_scores || []).map(this.mapToESGScore),
      benchmarks: (data.esg_benchmarks || []).map(this.mapToESGBenchmark),
      trends: (data.esg_trends || []).map(this.mapToESGTrend),
      risks: (data.esg_risks || []).map(this.mapToESGRisk),
      opportunities: (data.esg_opportunities || []).map(this.mapToESGOpportunity),
      recommendations: (data.esg_recommendations || []).map(this.mapToESGRecommendation),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      status: data.status
    }
  }

  private mapToESGScore = (data: any): ESGScore => ({
    id: data.id,
    organizationId: data.organization_id,
    category: data.category,
    subcategory: data.subcategory,
    score: data.score,
    maxScore: data.max_score,
    percentile: data.percentile,
    period: data.period,
    framework: data.framework,
    calculatedAt: data.calculated_at,
    breakdown: (data.esg_score_breakdowns || []).map((b: any) => ({
      metricId: b.metric_id,
      metricName: b.metric_name,
      weight: b.weight,
      rawValue: b.raw_value,
      normalizedScore: b.normalized_score,
      contribution: b.contribution
    }))
  })

  private mapToESGDataPoint = (data: any): ESGDataPoint => ({
    id: data.id,
    metricId: data.metric_id,
    organizationId: data.organization_id,
    value: data.value,
    period: data.period,
    unit: data.unit,
    dataSource: data.data_source,
    verificationStatus: data.verification_status,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by
  })

  private mapToESGMetric = (data: any): ESGMetric => ({
    id: data.id,
    category: data.category,
    subcategory: data.subcategory,
    name: data.name,
    description: data.description,
    unit: data.unit,
    target: data.target,
    weight: data.weight,
    framework: data.framework,
    dataSource: data.data_source,
    calculationMethod: data.calculation_method,
    reportingFrequency: data.reporting_frequency,
    isRequired: data.is_required,
    tags: data.tags
  })

  private mapToESGConfiguration = (data: any): ESGConfiguration => ({
    organizationId: data.organization_id,
    framework: data.framework,
    reportingPeriod: data.reporting_period,
    industryBenchmarks: data.industry_benchmarks,
    peerComparison: data.peer_comparison,
    enabledCategories: data.enabled_categories,
    customMetrics: data.custom_metrics,
    weightings: data.weightings,
    dataQualityThresholds: data.data_quality_thresholds,
    notificationSettings: data.notification_settings
  })

  private mapToESGBenchmark = (data: any) => ({
    category: data.category,
    metric: data.metric,
    organizationScore: data.organization_score,
    industryAverage: data.industry_average,
    industryMedian: data.industry_median,
    topQuartile: data.top_quartile,
    bestInClass: data.best_in_class,
    percentileRank: data.percentile_rank
  })

  private mapToESGTrend = (data: any) => ({
    category: data.category,
    metric: data.metric,
    currentValue: data.current_value,
    previousValue: data.previous_value,
    changePercent: data.change_percent,
    trend: data.trend,
    periods: data.periods
  })

  private mapToESGRisk = (data: any): ESGRisk => ({
    id: data.id,
    category: data.category,
    title: data.title,
    description: data.description,
    impact: data.impact,
    likelihood: data.likelihood,
    riskScore: data.risk_score,
    mitigation: data.mitigation,
    owner: data.owner,
    dueDate: data.due_date,
    status: data.status
  })

  private mapToESGOpportunity = (data: any): ESGOpportunity => ({
    id: data.id,
    category: data.category,
    title: data.title,
    description: data.description,
    potentialImpact: data.potential_impact,
    effort: data.effort,
    timeframe: data.timeframe,
    estimatedValue: data.estimated_value,
    actionItems: data.action_items,
    owner: data.owner,
    status: data.status
  })

  private mapToESGRecommendation = (data: any): ESGRecommendation => ({
    id: data.id,
    category: data.category,
    priority: data.priority,
    title: data.title,
    description: data.description,
    rationale: data.rationale,
    expectedImpact: data.expected_impact,
    implementation: data.implementation,
    timeline: data.timeline,
    resources: data.resources,
    successMetrics: data.success_metrics,
    status: data.status
  })
}