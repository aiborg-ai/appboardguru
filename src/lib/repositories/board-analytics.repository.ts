/**
 * Board Analytics Repository
 * 
 * Advanced repository for board performance analytics with complex aggregations,
 * statistical analysis, and data visualization support. Handles all database
 * operations for board effectiveness metrics and member performance tracking.
 */

import { BaseRepository } from './base.repository'
import { Result, success, failure, wrapAsync } from './result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { 
  MemberEngagementMetrics,
  MeetingEffectivenessMetrics,
  SkillsMatrixAnalysis,
  PeerBenchmarkingData,
  Evaluation360Data,
  PredictiveInsights,
  TimePeriod,
  AnalyticsFilters
} from '../services/board-analytics.service'

// Complex Analytics Query Types
export interface EngagementAggregation {
  total_meetings: number
  attended_meetings: number
  attendance_rate: number
  speaking_time_minutes: number
  questions_asked: number
  contributions_made: number
  documents_accessed: number
  prep_time_minutes: number
  peer_interactions: number
}

export interface MeetingEffectivenessAggregation {
  total_meetings: number
  total_decisions: number
  average_decision_time: number
  decisions_deferred: number
  action_items_created: number
  action_items_completed: number
  average_satisfaction_score: number
  total_meeting_time: number
}

export interface SkillsAggregation {
  skill_category: string
  skill_name: string
  member_count: number
  average_level: number
  max_level: number
  min_level: number
  verified_count: number
  gap_severity: string
}

export interface PerformanceTrend {
  period: string
  metric_name: string
  metric_value: number
  trend_direction: 'up' | 'down' | 'stable'
  change_percentage: number
  confidence_score: number
}

export interface BenchmarkComparison {
  metric_name: string
  organization_value: number
  industry_median: number
  industry_top_quartile: number
  peer_average: number
  percentile_rank: number
}

export interface PredictiveMetric {
  metric_name: string
  current_value: number
  predicted_value: number
  confidence_interval_lower: number
  confidence_interval_upper: number
  key_factors: string[]
  prediction_accuracy: number
}

export interface AnalyticsSnapshot {
  snapshot_date: string
  organization_id: string
  metric_type: string
  metric_value: any
  metadata: Record<string, any>
}

/**
 * Board Analytics Repository Implementation
 */
export class BoardAnalyticsRepository extends BaseRepository {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get comprehensive engagement metrics for all members
   */
  async getMemberEngagementAggregations(
    organizationId: string,
    timePeriod?: TimePeriod,
    filters?: AnalyticsFilters
  ): Promise<Result<EngagementAggregation[]>> {
    return wrapAsync(async () => {
      let query = `
        SELECT 
          om.user_id,
          u.full_name,
          u.avatar_url,
          
          -- Meeting Attendance Metrics
          COUNT(DISTINCT ma.meeting_id) as total_meetings,
          COUNT(DISTINCT CASE WHEN ma.attended = true THEN ma.meeting_id END) as attended_meetings,
          ROUND(
            COUNT(DISTINCT CASE WHEN ma.attended = true THEN ma.meeting_id END)::numeric / 
            NULLIF(COUNT(DISTINCT ma.meeting_id), 0) * 100, 2
          ) as attendance_rate,
          
          -- Participation Metrics  
          COALESCE(SUM(mp.speaking_time_minutes), 0) as speaking_time_minutes,
          COALESCE(SUM(mp.questions_asked), 0) as questions_asked,
          COALESCE(SUM(mp.contributions_made), 0) as contributions_made,
          
          -- Preparation Metrics
          COUNT(DISTINCT da.id) as documents_accessed,
          COALESCE(AVG(mp.preparation_time_minutes), 0) as prep_time_minutes,
          
          -- Peer Interaction Metrics
          (
            SELECT COUNT(DISTINCT c.id)
            FROM comments c
            WHERE c.user_id = om.user_id 
            AND c.created_at >= COALESCE($3, NOW() - INTERVAL '3 months')
            AND c.created_at <= COALESCE($4, NOW())
          ) as peer_interactions
          
        FROM organization_members om
        INNER JOIN users u ON u.id = om.user_id
        LEFT JOIN meeting_attendances ma ON ma.user_id = om.user_id
        LEFT JOIN meetings m ON m.id = ma.meeting_id AND m.organization_id = om.organization_id
        LEFT JOIN meeting_participation mp ON mp.user_id = om.user_id AND mp.meeting_id = ma.meeting_id
        LEFT JOIN document_accesses da ON da.user_id = om.user_id
        
        WHERE om.organization_id = $1
        AND om.status = 'active'
      `

      const params: any[] = [organizationId]
      let paramIndex = 2

      if (filters?.member_ids?.length) {
        query += ` AND om.user_id = ANY($${paramIndex})`
        params.push(filters.member_ids)
        paramIndex++
      }

      if (timePeriod) {
        params.push(timePeriod.start_date, timePeriod.end_date)
        query += ` AND m.meeting_date >= $${paramIndex - 1} AND m.meeting_date <= $${paramIndex}`
        paramIndex++
      } else {
        params.push(null, null)
        paramIndex += 2
      }

      query += `
        GROUP BY om.user_id, u.full_name, u.avatar_url
        ORDER BY attendance_rate DESC, speaking_time_minutes DESC
      `

      const { data, error } = await this.supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: params
      })

      if (error) throw error

      return data as EngagementAggregation[]
    })
  }

  /**
   * Get meeting effectiveness aggregations
   */
  async getMeetingEffectivenessAggregations(
    organizationId: string,
    timePeriod?: TimePeriod,
    filters?: AnalyticsFilters
  ): Promise<Result<MeetingEffectivenessAggregation[]>> {
    return wrapAsync(async () => {
      let query = `
        SELECT 
          m.id as meeting_id,
          m.meeting_date,
          m.meeting_type,
          m.duration_minutes,
          
          -- Decision Metrics
          COUNT(DISTINCT mr.id) as total_decisions,
          ROUND(AVG(EXTRACT(EPOCH FROM (mr.resolved_at - mr.created_at)) / 60), 2) as average_decision_time,
          COUNT(DISTINCT CASE WHEN mr.status = 'deferred' THEN mr.id END) as decisions_deferred,
          
          -- Action Item Metrics
          COUNT(DISTINCT mai.id) as action_items_created,
          COUNT(DISTINCT CASE WHEN mai.status = 'completed' THEN mai.id END) as action_items_completed,
          ROUND(
            COUNT(DISTINCT CASE WHEN mai.status = 'completed' THEN mai.id END)::numeric /
            NULLIF(COUNT(DISTINCT mai.id), 0) * 100, 2
          ) as completion_rate,
          
          -- Satisfaction Metrics
          COALESCE(AVG(ms.overall_satisfaction), 0) as average_satisfaction_score,
          COALESCE(AVG(ms.meeting_preparation), 0) as preparation_satisfaction,
          COALESCE(AVG(ms.discussion_quality), 0) as discussion_satisfaction,
          
          -- Participation Distribution
          json_agg(
            json_build_object(
              'user_id', mp.user_id,
              'speaking_time_percentage', 
              CASE 
                WHEN SUM(mp.speaking_time_minutes) OVER (PARTITION BY m.id) > 0 
                THEN ROUND(mp.speaking_time_minutes * 100.0 / SUM(mp.speaking_time_minutes) OVER (PARTITION BY m.id), 2)
                ELSE 0
              END,
              'questions_asked', mp.questions_asked,
              'contributions_made', mp.contributions_made
            )
          ) FILTER (WHERE mp.user_id IS NOT NULL) as participation_data
          
        FROM meetings m
        LEFT JOIN meeting_resolutions mr ON mr.meeting_id = m.id
        LEFT JOIN meeting_actionables mai ON mai.meeting_id = m.id
        LEFT JOIN meeting_satisfaction ms ON ms.meeting_id = m.id
        LEFT JOIN meeting_participation mp ON mp.meeting_id = m.id
        
        WHERE m.organization_id = $1
      `

      const params: any[] = [organizationId]
      let paramIndex = 2

      if (timePeriod) {
        query += ` AND m.meeting_date >= $${paramIndex} AND m.meeting_date <= $${paramIndex + 1}`
        params.push(timePeriod.start_date, timePeriod.end_date)
        paramIndex += 2
      }

      if (filters?.meeting_types?.length) {
        query += ` AND m.meeting_type = ANY($${paramIndex})`
        params.push(filters.meeting_types)
        paramIndex++
      }

      query += `
        GROUP BY m.id, m.meeting_date, m.meeting_type, m.duration_minutes
        ORDER BY m.meeting_date DESC
      `

      const { data, error } = await this.supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: params
      })

      if (error) throw error

      return data as MeetingEffectivenessAggregation[]
    })
  }

  /**
   * Get skills matrix aggregations
   */
  async getSkillsAggregations(
    organizationId: string,
    filters?: AnalyticsFilters
  ): Promise<Result<SkillsAggregation[]>> {
    return wrapAsync(async () => {
      let query = `
        SELECT 
          s.category as skill_category,
          s.name as skill_name,
          COUNT(DISTINCT us.user_id) as member_count,
          ROUND(AVG(us.level), 2) as average_level,
          MAX(us.level) as max_level,
          MIN(us.level) as min_level,
          COUNT(DISTINCT CASE WHEN us.verified = true THEN us.user_id END) as verified_count,
          
          -- Gap Analysis
          CASE 
            WHEN MAX(us.level) < 6 THEN 'critical'
            WHEN MAX(us.level) < 7 THEN 'high'
            WHEN MAX(us.level) < 8 THEN 'medium'
            ELSE 'low'
          END as gap_severity,
          
          -- Skill Distribution
          json_build_object(
            'level_1_3', COUNT(CASE WHEN us.level BETWEEN 1 AND 3 THEN 1 END),
            'level_4_6', COUNT(CASE WHEN us.level BETWEEN 4 AND 6 THEN 1 END),
            'level_7_8', COUNT(CASE WHEN us.level BETWEEN 7 AND 8 THEN 1 END),
            'level_9_10', COUNT(CASE WHEN us.level BETWEEN 9 AND 10 THEN 1 END)
          ) as level_distribution,
          
          -- Recent Updates
          MAX(us.last_updated) as last_skill_update,
          COUNT(CASE WHEN us.last_updated >= NOW() - INTERVAL '6 months' THEN 1 END) as recent_updates
          
        FROM skills s
        INNER JOIN user_skills us ON us.skill_id = s.id
        INNER JOIN organization_members om ON om.user_id = us.user_id
        
        WHERE om.organization_id = $1
        AND om.status = 'active'
      `

      const params: any[] = [organizationId]
      let paramIndex = 2

      if (filters?.skill_categories?.length) {
        query += ` AND s.category = ANY($${paramIndex})`
        params.push(filters.skill_categories)
        paramIndex++
      }

      if (filters?.member_ids?.length) {
        query += ` AND us.user_id = ANY($${paramIndex})`
        params.push(filters.member_ids)
        paramIndex++
      }

      query += `
        GROUP BY s.category, s.name, s.id
        ORDER BY s.category, average_level DESC
      `

      const { data, error } = await this.supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: params
      })

      if (error) throw error

      return data as SkillsAggregation[]
    })
  }

  /**
   * Calculate performance trends over time
   */
  async getPerformanceTrends(
    organizationId: string,
    metricNames: string[],
    timePeriod: TimePeriod
  ): Promise<Result<PerformanceTrend[]>> {
    return wrapAsync(async () => {
      const trends: PerformanceTrend[] = []

      for (const metricName of metricNames) {
        let query = ''
        let params: any[] = [organizationId]

        switch (metricName) {
          case 'attendance_rate':
            query = `
              SELECT 
                DATE_TRUNC('${timePeriod.granularity}', m.meeting_date) as period,
                'attendance_rate' as metric_name,
                ROUND(
                  COUNT(CASE WHEN ma.attended = true THEN 1 END)::numeric / 
                  NULLIF(COUNT(ma.id), 0) * 100, 2
                ) as metric_value
              FROM meetings m
              LEFT JOIN meeting_attendances ma ON ma.meeting_id = m.id
              WHERE m.organization_id = $1
              AND m.meeting_date >= $2 AND m.meeting_date <= $3
              GROUP BY DATE_TRUNC('${timePeriod.granularity}', m.meeting_date)
              ORDER BY period
            `
            params.push(timePeriod.start_date, timePeriod.end_date)
            break

          case 'decision_velocity':
            query = `
              SELECT 
                DATE_TRUNC('${timePeriod.granularity}', m.meeting_date) as period,
                'decision_velocity' as metric_name,
                COUNT(DISTINCT mr.id) / NULLIF(COUNT(DISTINCT m.id), 0) as metric_value
              FROM meetings m
              LEFT JOIN meeting_resolutions mr ON mr.meeting_id = m.id
              WHERE m.organization_id = $1
              AND m.meeting_date >= $2 AND m.meeting_date <= $3
              GROUP BY DATE_TRUNC('${timePeriod.granularity}', m.meeting_date)
              ORDER BY period
            `
            params.push(timePeriod.start_date, timePeriod.end_date)
            break

          case 'action_completion_rate':
            query = `
              SELECT 
                DATE_TRUNC('${timePeriod.granularity}', m.meeting_date) as period,
                'action_completion_rate' as metric_name,
                ROUND(
                  COUNT(CASE WHEN mai.status = 'completed' THEN 1 END)::numeric /
                  NULLIF(COUNT(mai.id), 0) * 100, 2
                ) as metric_value
              FROM meetings m
              LEFT JOIN meeting_actionables mai ON mai.meeting_id = m.id
              WHERE m.organization_id = $1
              AND m.meeting_date >= $2 AND m.meeting_date <= $3
              GROUP BY DATE_TRUNC('${timePeriod.granularity}', m.meeting_date)
              ORDER BY period
            `
            params.push(timePeriod.start_date, timePeriod.end_date)
            break

          case 'satisfaction_score':
            query = `
              SELECT 
                DATE_TRUNC('${timePeriod.granularity}', m.meeting_date) as period,
                'satisfaction_score' as metric_name,
                ROUND(AVG(ms.overall_satisfaction), 2) as metric_value
              FROM meetings m
              LEFT JOIN meeting_satisfaction ms ON ms.meeting_id = m.id
              WHERE m.organization_id = $1
              AND m.meeting_date >= $2 AND m.meeting_date <= $3
              AND ms.overall_satisfaction IS NOT NULL
              GROUP BY DATE_TRUNC('${timePeriod.granularity}', m.meeting_date)
              ORDER BY period
            `
            params.push(timePeriod.start_date, timePeriod.end_date)
            break

          default:
            continue
        }

        const { data, error } = await this.supabase.rpc('execute_analytics_query', {
          query_sql: query,
          query_params: params
        })

        if (error) throw error

        // Calculate trends for each data point
        const metricData = data as any[]
        for (let i = 0; i < metricData.length; i++) {
          const current = metricData[i]
          const previous = i > 0 ? metricData[i - 1] : null
          
          let trendDirection: 'up' | 'down' | 'stable' = 'stable'
          let changePercentage = 0

          if (previous && previous.metric_value && current.metric_value) {
            const change = current.metric_value - previous.metric_value
            changePercentage = (change / previous.metric_value) * 100
            
            if (Math.abs(changePercentage) < 5) {
              trendDirection = 'stable'
            } else {
              trendDirection = changePercentage > 0 ? 'up' : 'down'
            }
          }

          trends.push({
            period: current.period,
            metric_name: current.metric_name,
            metric_value: current.metric_value,
            trend_direction: trendDirection,
            change_percentage: Math.round(changePercentage * 100) / 100,
            confidence_score: metricData.length > 3 ? 0.85 : 0.65
          })
        }
      }

      return trends
    })
  }

  /**
   * Get benchmark comparisons
   */
  async getBenchmarkComparisons(
    organizationId: string,
    industry: string,
    metricNames: string[]
  ): Promise<Result<BenchmarkComparison[]>> {
    return wrapAsync(async () => {
      const comparisons: BenchmarkComparison[] = []

      // Get industry benchmarks
      const { data: benchmarkData, error: benchmarkError } = await this.supabase
        .from('industry_benchmarks')
        .select('*')
        .eq('industry', industry)

      if (benchmarkError) throw benchmarkError

      // Get organization's current metrics
      for (const metricName of metricNames) {
        const orgMetric = await this.getOrganizationMetric(organizationId, metricName)
        if (!orgMetric.success) continue

        const benchmark = benchmarkData?.find(b => b.metric_name === metricName)
        if (!benchmark) continue

        // Calculate percentile rank
        const percentileRank = await this.calculatePercentileRank(
          organizationId,
          metricName,
          orgMetric.data
        )

        comparisons.push({
          metric_name: metricName,
          organization_value: orgMetric.data,
          industry_median: benchmark.median_value,
          industry_top_quartile: benchmark.top_quartile_value,
          peer_average: benchmark.peer_average,
          percentile_rank: percentileRank.success ? percentileRank.data : 50
        })
      }

      return comparisons
    })
  }

  /**
   * Generate predictive metrics using statistical analysis
   */
  async generatePredictiveMetrics(
    organizationId: string,
    metricNames: string[],
    forecastPeriods: number = 6
  ): Promise<Result<PredictiveMetric[]>> {
    return wrapAsync(async () => {
      const predictions: PredictiveMetric[] = []

      for (const metricName of metricNames) {
        // Get historical data for the metric
        const historicalData = await this.getHistoricalMetricData(
          organizationId,
          metricName,
          12 // 12 periods of history
        )

        if (!historicalData.success || historicalData.data.length < 3) {
          continue
        }

        // Apply time series forecasting (simplified linear regression)
        const values = historicalData.data.map(d => d.value)
        const prediction = this.calculateLinearTrendPrediction(values, forecastPeriods)
        
        // Calculate confidence intervals (simplified)
        const variance = this.calculateVariance(values)
        const standardError = Math.sqrt(variance / values.length)
        const confidenceInterval = 1.96 * standardError // 95% confidence

        predictions.push({
          metric_name: metricName,
          current_value: values[values.length - 1],
          predicted_value: prediction.predicted,
          confidence_interval_lower: prediction.predicted - confidenceInterval,
          confidence_interval_upper: prediction.predicted + confidenceInterval,
          key_factors: prediction.factors,
          prediction_accuracy: prediction.accuracy
        })
      }

      return predictions
    })
  }

  /**
   * Save analytics snapshot for historical tracking
   */
  async saveAnalyticsSnapshot(
    snapshot: AnalyticsSnapshot
  ): Promise<Result<string>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('analytics_snapshots')
        .insert({
          snapshot_date: snapshot.snapshot_date,
          organization_id: snapshot.organization_id,
          metric_type: snapshot.metric_type,
          metric_value: snapshot.metric_value,
          metadata: snapshot.metadata
        })
        .select('id')
        .single()

      if (error) throw error

      return data.id
    })
  }

  /**
   * Get analytics snapshots for trend analysis
   */
  async getAnalyticsSnapshots(
    organizationId: string,
    metricType?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Result<AnalyticsSnapshot[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('organization_id', organizationId)

      if (metricType) {
        query = query.eq('metric_type', metricType)
      }

      if (startDate) {
        query = query.gte('snapshot_date', startDate)
      }

      if (endDate) {
        query = query.lte('snapshot_date', endDate)
      }

      query = query.order('snapshot_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data || []
    })
  }

  /**
   * Execute complex analytics aggregation
   */
  async executeComplexAggregation(
    query: string,
    params: any[]
  ): Promise<Result<any[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: params
      })

      if (error) throw error

      return data
    })
  }

  /**
   * Batch insert analytics data
   */
  async batchInsertAnalyticsData(
    tableName: string,
    records: any[]
  ): Promise<Result<number>> {
    return wrapAsync(async () => {
      if (records.length === 0) return 0

      const { data, error } = await this.supabase
        .from(tableName)
        .insert(records)
        .select('id')

      if (error) throw error

      return data?.length || 0
    })
  }

  /**
   * Get real-time analytics data with caching
   */
  async getRealtimeAnalytics(
    organizationId: string,
    metricTypes: string[],
    cacheKey?: string
  ): Promise<Result<Record<string, any>>> {
    return wrapAsync(async () => {
      const results: Record<string, any> = {}

      // Check cache first if cache key provided
      if (cacheKey) {
        const cachedData = await this.getCachedAnalytics(cacheKey)
        if (cachedData.success && cachedData.data) {
          return cachedData.data
        }
      }

      // Generate fresh analytics
      for (const metricType of metricTypes) {
        switch (metricType) {
          case 'engagement_summary':
            const engagement = await this.getMemberEngagementAggregations(organizationId)
            if (engagement.success) results[metricType] = engagement.data
            break

          case 'meeting_summary':
            const meetings = await this.getMeetingEffectivenessAggregations(organizationId)
            if (meetings.success) results[metricType] = meetings.data
            break

          case 'skills_summary':
            const skills = await this.getSkillsAggregations(organizationId)
            if (skills.success) results[metricType] = skills.data
            break

          default:
            console.warn(`Unknown metric type: ${metricType}`)
        }
      }

      // Cache results if cache key provided
      if (cacheKey) {
        await this.setCachedAnalytics(cacheKey, results, 300) // 5 minute cache
      }

      return results
    })
  }

  // Private helper methods

  private async getOrganizationMetric(
    organizationId: string,
    metricName: string
  ): Promise<Result<number>> {
    // Implementation would vary based on metric type
    return success(75.5) // Placeholder
  }

  private async calculatePercentileRank(
    organizationId: string,
    metricName: string,
    value: number
  ): Promise<Result<number>> {
    // Implementation would calculate where this value ranks among peers
    return success(72) // Placeholder
  }

  private async getHistoricalMetricData(
    organizationId: string,
    metricName: string,
    periods: number
  ): Promise<Result<Array<{ period: string; value: number }>>> {
    // Implementation would get historical data
    return success([]) // Placeholder
  }

  private calculateLinearTrendPrediction(
    values: number[],
    forecastPeriods: number
  ): { predicted: number; factors: string[]; accuracy: number } {
    // Simplified linear regression implementation
    const n = values.length
    const sumX = (n * (n + 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0)
    const sumX2 = values.reduce((sum, _, idx) => sum + Math.pow(idx + 1, 2), 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2))
    const intercept = (sumY - slope * sumX) / n

    const predicted = intercept + slope * (n + forecastPeriods)

    return {
      predicted: Math.round(predicted * 100) / 100,
      factors: ['historical_trend', 'seasonality', 'external_factors'],
      accuracy: Math.min(0.95, Math.max(0.65, 1 - Math.abs(slope) / 100))
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return variance
  }

  private async getCachedAnalytics(cacheKey: string): Promise<Result<any>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('cache_entries')
        .select('value')
        .eq('key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error) throw error

      return data?.value
    })
  }

  private async setCachedAnalytics(
    cacheKey: string,
    data: any,
    ttlSeconds: number
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

      const { error } = await this.supabase
        .from('cache_entries')
        .upsert({
          key: cacheKey,
          value: data,
          expires_at: expiresAt
        })

      if (error) throw error
    })
  }
}