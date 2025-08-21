/**
 * Pattern Recognition Engine for Predictive Notifications
 * Uses machine learning algorithms to detect patterns in user behavior and board activities
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// ML Algorithm Implementations
import { StatisticalAnalysis } from './ml/statistical-analysis'
import { TimeSeriesAnalysis } from './ml/time-series-analysis'
import { AnomalyDetection } from './ml/anomaly-detection'
import { UserSegmentation } from './ml/user-segmentation'
import { PredictionModel } from './ml/prediction-model'

type UserBehaviorMetric = Database['public']['Tables']['user_behavior_metrics']['Row']
type NotificationPattern = Database['public']['Tables']['notification_patterns']['Row']
type AnomalyDetectionRow = Database['public']['Tables']['anomaly_detections']['Row']

// Type-safe pattern parameters based on pattern type
type PatternParameters = 
  | { type: 'timing'; optimalHours: readonly number[]; timezone: string; weekdays: readonly number[] }
  | { type: 'engagement'; avgResponseTime: number; peakDays: readonly string[]; channels: readonly string[] }
  | { type: 'content'; preferredTypes: readonly string[]; sentiment: 'positive' | 'negative' | 'neutral'; topics: readonly string[] }
  | { type: 'frequency'; optimalFrequency: number; maxDaily: number; quietHours: readonly number[] }
  | { type: 'sequence'; patterns: readonly string[]; triggers: readonly string[]; outcomes: readonly string[] }
  | Record<string, unknown>;

export interface PatternAnalysisResult {
  readonly patternId: string
  readonly patternType: 'timing' | 'engagement' | 'content' | 'frequency' | 'sequence'
  readonly confidence: number
  readonly description: string
  readonly parameters: PatternParameters
  readonly recommendations: readonly string[]
  readonly affectedUsers: readonly string[]
  readonly potentialActions: readonly PotentialAction[]
}

export interface PotentialAction {
  type: 'optimize_timing' | 'adjust_frequency' | 'change_content' | 'personalize'
  description: string
  expectedImprovement: number // percentage
  confidence: number
}

// Type-safe metadata for time series data
interface TimeSeriesMetadata {
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly quality?: 'high' | 'medium' | 'low';
  readonly processed?: boolean;
  readonly [key: string]: unknown;
}

export interface TimeSeriesData {
  readonly timestamp: Date
  readonly value: number
  readonly metadata?: TimeSeriesMetadata
}

export interface UserEngagementProfile {
  userId: string
  preferredTimes: number[] // hours of day (0-23)
  responsePatterns: {
    averageResponseTime: number
    peakEngagementDays: string[]
    preferredNotificationTypes: string[]
  }
  behaviorSegment: 'highly_engaged' | 'moderate' | 'low_engagement' | 'sporadic'
  riskFactors: string[]
}

export class PatternRecognitionEngine {
  private supabase: SupabaseClient<Database> | null = null
  private statisticalAnalysis: StatisticalAnalysis
  private timeSeriesAnalysis: TimeSeriesAnalysis
  private anomalyDetection: AnomalyDetection
  private userSegmentation: UserSegmentation
  private predictionModel: PredictionModel

  constructor() {
    // Initialize ML components
    this.statisticalAnalysis = new StatisticalAnalysis()
    this.timeSeriesAnalysis = new TimeSeriesAnalysis()
    this.anomalyDetection = new AnomalyDetection()
    this.userSegmentation = new UserSegmentation()
    this.predictionModel = new PredictionModel()
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient()
    }
    return this.supabase
  }

  /**
   * Main entry point for pattern analysis
   */
  async analyzePatterns(
    organizationId: string,
    options: {
      userId?: string
      lookbackDays?: number
      patternTypes?: string[]
      minConfidence?: number
    } = {}
  ): Promise<PatternAnalysisResult[]> {
    const {
      userId,
      lookbackDays = 30,
      patternTypes = ['timing', 'engagement', 'content', 'frequency'],
      minConfidence = 0.7
    } = options

    try {
      // Gather behavioral data
      const behaviorData = await this.gatherBehaviorData(organizationId, userId, lookbackDays)
      
      if (behaviorData.length === 0) {
        return []
      }

      const patterns: PatternAnalysisResult[] = []

      // Analyze timing patterns
      if (patternTypes.includes('timing')) {
        const timingPatterns = await this.analyzeTimingPatterns(behaviorData)
        patterns.push(...timingPatterns.filter(p => p.confidence >= minConfidence))
      }

      // Analyze engagement patterns
      if (patternTypes.includes('engagement')) {
        const engagementPatterns = await this.analyzeEngagementPatterns(behaviorData)
        patterns.push(...engagementPatterns.filter(p => p.confidence >= minConfidence))
      }

      // Analyze content patterns
      if (patternTypes.includes('content')) {
        const contentPatterns = await this.analyzeContentPatterns(behaviorData)
        patterns.push(...contentPatterns.filter(p => p.confidence >= minConfidence))
      }

      // Analyze frequency patterns
      if (patternTypes.includes('frequency')) {
        const frequencyPatterns = await this.analyzeFrequencyPatterns(behaviorData)
        patterns.push(...frequencyPatterns.filter(p => p.confidence >= minConfidence))
      }

      // Store discovered patterns
      await this.storePatterns(patterns, organizationId, userId)

      return patterns

    } catch (error) {
      console.error('Pattern analysis failed:', error)
      throw new Error('Failed to analyze patterns')
    }
  }

  /**
   * Detect anomalies in user behavior or board activities
   */
  async detectAnomalies(
    organizationId: string,
    options: {
      userId?: string
      lookbackDays?: number
      sensitivity?: 'low' | 'medium' | 'high'
    } = {}
  ): Promise<AnomalyDetectionRow[]> {
    const { userId, lookbackDays = 14, sensitivity = 'medium' } = options

    try {
      // Get baseline behavior data
      const baselineData = await this.gatherBehaviorData(organizationId, userId, lookbackDays * 2)
      const recentData = await this.gatherBehaviorData(organizationId, userId, lookbackDays)

      if (baselineData.length === 0 || recentData.length === 0) {
        return []
      }

      // Detect various types of anomalies
      const anomalies = await this.anomalyDetection.detectAnomalies(
        baselineData,
        recentData,
        sensitivity
      )

      // Store anomaly detections
      const storedAnomalies = await this.storeAnomalies(anomalies, organizationId, userId)

      return storedAnomalies

    } catch (error) {
      console.error('Anomaly detection failed:', error)
      throw new Error('Failed to detect anomalies')
    }
  }

  /**
   * Generate user engagement profiles for personalization
   */
  async generateUserEngagementProfiles(
    organizationId: string,
    userIds?: string[]
  ): Promise<UserEngagementProfile[]> {
    try {
      // If no specific users provided, get all active users in organization
      if (!userIds) {
        const { data: orgMembers } = (await this.getSupabase())
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('status', 'active')

        userIds = orgMembers?.map((m) => m.user_id) || []
      }

      const profiles: UserEngagementProfile[] = []

      for (const userId of userIds || []) {
        const profile = await this.generateSingleUserProfile(organizationId, userId)
        if (profile) {
          profiles.push(profile)
        }
      }

      return profiles

    } catch (error) {
      console.error('Failed to generate user profiles:', error)
      throw new Error('Failed to generate user engagement profiles')
    }
  }

  /**
   * Predict optimal notification timing for a user
   */
  async predictOptimalTiming(
    userId: string,
    notificationType: string,
    organizationId?: string
  ): Promise<{
    recommendedTime: Date
    confidence: number
    alternativeTimes: Date[]
    reasoning: string
  }> {
    try {
      // Get user's historical behavior
      const behaviorData = await this.gatherBehaviorData(organizationId, userId, 30)
      
      // Get user engagement profile
      const profile = await this.generateSingleUserProfile(organizationId, userId)
      
      if (!profile || behaviorData.length === 0) {
        // Fall back to general best practices
        return this.getDefaultOptimalTiming(notificationType)
      }

      // Use ML model to predict optimal timing
      const prediction = await this.predictionModel.predictOptimalTiming(
        behaviorData,
        profile,
        notificationType
      )

      return prediction

    } catch (error) {
      console.error('Timing prediction failed:', error)
      return this.getDefaultOptimalTiming(notificationType)
    }
  }

  /**
   * Analyze time-series trends in board activity
   */
  async analyzeBoardActivityTrends(
    organizationId: string,
    metricType: string,
    lookbackDays: number = 90
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal'
    changeRate: number // percentage change
    seasonalityDetected: boolean
    forecast: TimeSeriesData[]
    confidence: number
    insights: string[]
  }> {
    try {
      // Get time series data for the metric
      const timeSeriesData = await this.getTimeSeriesData(organizationId, metricType, lookbackDays)

      if (timeSeriesData.length === 0) {
        throw new Error('Insufficient data for trend analysis')
      }

      // Analyze trends using time series analysis
      const analysis = await this.timeSeriesAnalysis.analyzeTrend(timeSeriesData)

      return analysis

    } catch (error) {
      console.error('Trend analysis failed:', error)
      throw new Error('Failed to analyze board activity trends')
    }
  }

  /**
   * Compare organization metrics against industry benchmarks
   */
  async compareAgainstBenchmarks(
    organizationId: string,
    industry: string,
    organizationSize: string
  ): Promise<{
    metrics: Array<{
      metricType: string
      organizationValue: number
      industryPercentile: number
      comparison: 'above_average' | 'average' | 'below_average'
      recommendations: string[]
    }>
    overallScore: number
    riskAreas: string[]
    strengths: string[]
  }> {
    try {
      // Get organization's current metrics
      const orgMetrics = await this.getOrganizationMetrics(organizationId)

      // Get industry benchmarks
      const { data: benchmarks } = (await this.getSupabase())
        .from('board_benchmarks')
        .select('*')
        .eq('industry', industry)
        .eq('organization_size', organizationSize)
        .eq('is_active', true)

      if (!benchmarks || benchmarks.length === 0) {
        throw new Error('No benchmark data available for this industry/size combination')
      }

      // Compare metrics against benchmarks
      const comparison = await this.statisticalAnalysis.compareAgainstBenchmarks(
        orgMetrics,
        benchmarks
      )

      return comparison

    } catch (error) {
      console.error('Benchmark comparison failed:', error)
      throw new Error('Failed to compare against industry benchmarks')
    }
  }

  // Private helper methods

  private async gatherBehaviorData(
    organizationId?: string,
    userId?: string,
    lookbackDays: number = 30
  ): Promise<UserBehaviorMetric[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

    let query = (await this.getSupabase())
      .from('user_behavior_metrics')
      .select('*')
      .gte('timestamp', cutoffDate.toISOString())
      .order('timestamp', { ascending: true })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to gather behavior data:', error)
      return []
    }

    return data || []
  }

  private async analyzeTimingPatterns(
    behaviorData: UserBehaviorMetric[]
  ): Promise<PatternAnalysisResult[]> {
    // Group data by hour of day and day of week
    const hourlyData = this.statisticalAnalysis.groupByTimeOfDay(behaviorData)
    const dailyData = this.statisticalAnalysis.groupByDayOfWeek(behaviorData)

    const patterns: PatternAnalysisResult[] = []

    // Analyze peak engagement hours
    const peakHours = this.statisticalAnalysis.findPeakEngagementTimes(hourlyData)
    if (peakHours.confidence > 0.7) {
      patterns.push({
        patternId: `timing-peak-hours-${Date.now()}`,
        patternType: 'timing',
        confidence: peakHours.confidence,
        description: `Peak engagement occurs at ${peakHours.hours.join(', ')} hours`,
        parameters: { peakHours: peakHours.hours, engagement_variance: peakHours.variance },
        recommendations: [
          `Schedule important notifications during peak hours: ${peakHours.hours.join(', ')}`,
          'Avoid sending notifications during low-engagement periods'
        ],
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'optimize_timing',
            description: 'Shift notification timing to peak engagement hours',
            expectedImprovement: 25,
            confidence: peakHours.confidence
          }
        ]
      })
    }

    // Analyze day-of-week patterns
    const weeklyPattern = this.statisticalAnalysis.analyzeWeeklyPattern(dailyData)
    if (weeklyPattern.confidence > 0.6) {
      patterns.push({
        patternId: `timing-weekly-${Date.now()}`,
        patternType: 'timing',
        confidence: weeklyPattern.confidence,
        description: `Weekly engagement pattern: ${weeklyPattern.description}`,
        parameters: weeklyPattern.parameters,
        recommendations: weeklyPattern.recommendations,
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'optimize_timing',
            description: 'Adjust weekly notification schedule based on engagement patterns',
            expectedImprovement: 15,
            confidence: weeklyPattern.confidence
          }
        ]
      })
    }

    return patterns
  }

  private async analyzeEngagementPatterns(
    behaviorData: UserBehaviorMetric[]
  ): Promise<PatternAnalysisResult[]> {
    const patterns: PatternAnalysisResult[] = []

    // Analyze response time patterns
    const responseTimeAnalysis = this.statisticalAnalysis.analyzeResponseTimes(behaviorData)
    if (responseTimeAnalysis.confidence > 0.65) {
      patterns.push({
        patternId: `engagement-response-time-${Date.now()}`,
        patternType: 'engagement',
        confidence: responseTimeAnalysis.confidence,
        description: responseTimeAnalysis.description,
        parameters: responseTimeAnalysis.parameters,
        recommendations: responseTimeAnalysis.recommendations,
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'adjust_frequency',
            description: 'Optimize notification frequency based on response patterns',
            expectedImprovement: 20,
            confidence: responseTimeAnalysis.confidence
          }
        ]
      })
    }

    // Analyze engagement score trends
    const engagementTrends = this.statisticalAnalysis.analyzeEngagementTrends(behaviorData)
    if (engagementTrends.confidence > 0.6) {
      patterns.push({
        patternId: `engagement-trends-${Date.now()}`,
        patternType: 'engagement',
        confidence: engagementTrends.confidence,
        description: engagementTrends.description,
        parameters: engagementTrends.parameters,
        recommendations: engagementTrends.recommendations,
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'personalize',
            description: 'Personalize notification content based on engagement trends',
            expectedImprovement: 30,
            confidence: engagementTrends.confidence
          }
        ]
      })
    }

    return patterns
  }

  private async analyzeContentPatterns(
    behaviorData: UserBehaviorMetric[]
  ): Promise<PatternAnalysisResult[]> {
    // Analyze which types of content get better engagement
    const contentAnalysis = this.statisticalAnalysis.analyzeContentEngagement(behaviorData)
    
    const patterns: PatternAnalysisResult[] = []

    if (contentAnalysis.confidence > 0.6) {
      patterns.push({
        patternId: `content-preferences-${Date.now()}`,
        patternType: 'content',
        confidence: contentAnalysis.confidence,
        description: contentAnalysis.description,
        parameters: contentAnalysis.parameters,
        recommendations: contentAnalysis.recommendations,
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'change_content',
            description: 'Optimize notification content based on preference patterns',
            expectedImprovement: 35,
            confidence: contentAnalysis.confidence
          }
        ]
      })
    }

    return patterns
  }

  private async analyzeFrequencyPatterns(
    behaviorData: UserBehaviorMetric[]
  ): Promise<PatternAnalysisResult[]> {
    // Analyze optimal notification frequency
    const frequencyAnalysis = this.statisticalAnalysis.analyzeOptimalFrequency(behaviorData)
    
    const patterns: PatternAnalysisResult[] = []

    if (frequencyAnalysis.confidence > 0.65) {
      patterns.push({
        patternId: `frequency-optimization-${Date.now()}`,
        patternType: 'frequency',
        confidence: frequencyAnalysis.confidence,
        description: frequencyAnalysis.description,
        parameters: frequencyAnalysis.parameters,
        recommendations: frequencyAnalysis.recommendations,
        affectedUsers: [...new Set(behaviorData.map(d => d.user_id))],
        potentialActions: [
          {
            type: 'adjust_frequency',
            description: 'Adjust notification frequency to optimal levels',
            expectedImprovement: 25,
            confidence: frequencyAnalysis.confidence
          }
        ]
      })
    }

    return patterns
  }

  private async storePatterns(
    patterns: PatternAnalysisResult[],
    organizationId?: string,
    userId?: string
  ): Promise<void> {
    for (const pattern of patterns) {
      (await this.getSupabase()).from('notification_patterns').upsert({
        pattern_id: pattern.patternId,
        pattern_type: pattern.patternType,
        organization_id: organizationId,
        user_id: userId,
        pattern_data: {
          parameters: pattern.parameters,
          recommendations: pattern.recommendations,
          potential_actions: pattern.potentialActions
        },
        confidence_score: pattern.confidence,
        frequency_detected: 1,
        last_detected_at: new Date().toISOString(),
        conditions: { description: pattern.description },
        outcomes: null,
        is_active: true
      }, { onConflict: 'pattern_id' })
    }
  }

  private async storeAnomalies(
    anomalies: AnomalyDetectionRow[],
    organizationId?: string,
    userId?: string
  ): Promise<AnomalyDetectionRow[]> {
    const storedAnomalies: AnomalyDetectionRow[] = []

    for (const anomaly of anomalies) {
      const { data } = (await this.getSupabase())
        .from('anomaly_detections')
        .insert({
          anomaly_id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organizationId,
          user_id: userId,
          anomaly_type: anomaly.type,
          severity: anomaly.severity,
          anomaly_score: anomaly.score,
          detection_method: anomaly.method,
          baseline_data: anomaly.baseline,
          anomalous_data: anomaly.anomalous,
          affected_metrics: anomaly.affectedMetrics,
          recommended_actions: anomaly.recommendedActions,
          investigation_status: 'new',
          is_resolved: false
        })
        .select()
        .single()

      if (data) {
        storedAnomalies.push(data)
      }
    }

    return storedAnomalies
  }

  private async generateSingleUserProfile(
    organizationId?: string,
    userId?: string
  ): Promise<UserEngagementProfile | null> {
    if (!userId) return null

    const behaviorData = await this.gatherBehaviorData(organizationId, userId, 60) // 60 days of data

    if (behaviorData.length === 0) return null

    // Analyze user's preferred times
    const preferredTimes = this.statisticalAnalysis.findUserPreferredTimes(behaviorData)
    
    // Analyze response patterns
    const responsePatterns = this.statisticalAnalysis.analyzeUserResponsePatterns(behaviorData)
    
    // Segment user based on engagement level
    const behaviorSegment = this.userSegmentation.segmentUser(behaviorData)
    
    // Identify risk factors
    const riskFactors = this.anomalyDetection.identifyUserRiskFactors(behaviorData)

    return {
      userId,
      preferredTimes,
      responsePatterns,
      behaviorSegment,
      riskFactors
    }
  }

  private getDefaultOptimalTiming(notificationType: string) {
    // Default timing recommendations based on best practices
    const defaults: Record<string, any> = {
      meeting: { hour: 9, confidence: 0.5 },
      asset: { hour: 14, confidence: 0.4 },
      reminder: { hour: 8, confidence: 0.6 },
      system: { hour: 10, confidence: 0.3 }
    }

    const defaultTiming = defaults[notificationType] || defaults.system
    const recommendedTime = new Date()
    recommendedTime.setHours(defaultTiming.hour, 0, 0, 0)

    return {
      recommendedTime,
      confidence: defaultTiming.confidence,
      alternativeTimes: [
        new Date(recommendedTime.getTime() + 2 * 60 * 60 * 1000), // +2 hours
        new Date(recommendedTime.getTime() + 4 * 60 * 60 * 1000)  // +4 hours
      ],
      reasoning: 'Default timing based on general best practices (insufficient user data)'
    }
  }

  private async getTimeSeriesData(
    organizationId: string,
    metricType: string,
    lookbackDays: number
  ): Promise<TimeSeriesData[]> {
    // Implementation depends on the specific metric type
    // This is a placeholder that would query relevant tables
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

    // Example: Get meeting frequency over time
    if (metricType === 'meeting_frequency') {
      const { data } = (await this.getSupabase())
        .from('meetings')
        .select('scheduled_start')
        .eq('organization_id', organizationId)
        .gte('scheduled_start', cutoffDate.toISOString())
        .order('scheduled_start')

      // Group by day and count meetings
      const dailyCounts = new Map<string, number>()
      data?.forEach((meeting: { id: string; start_time: string; end_time: string; participants?: unknown }) => {
        const day = meeting.scheduled_start.split('T')[0]
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1)
      })

      return Array.from(dailyCounts.entries()).map(([day, count]) => ({
        timestamp: new Date(day),
        value: count
      }))
    }

    return []
  }

  private async getOrganizationMetrics(organizationId: string): Promise<Record<string, number>> {
    // Get various organization metrics for benchmark comparison
    const metrics: Record<string, number> = {}

    // Meeting frequency (annual)
    const { data: meetings } = (await this.getSupabase())
      .from('meetings')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('scheduled_start', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

    metrics.meeting_frequency_annual = meetings?.length || 0

    // Document volume (monthly average)
    const { data: documents } = (await this.getSupabase())
      .from('board_packs')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    metrics.document_volume_monthly = documents?.length || 0

    // Add more metrics as needed...

    return metrics
  }
}

// Export singleton instance
export const patternRecognitionEngine = new PatternRecognitionEngine()