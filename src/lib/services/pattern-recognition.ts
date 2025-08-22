/**
 * Pattern Recognition Engine for Predictive Notifications
 * Uses machine learning algorithms to detect patterns in user behavior and board activities
 */

import { createSupabaseServerClient } from '../supabase-server'
import type { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// ML Algorithm Implementations
import { StatisticalAnalysis } from './ml/statistical-analysis'
import { TimeSeriesAnalysis } from './ml/time-series-analysis'
import { AnomalyDetection } from './ml/anomaly-detection'
import { UserSegmentation } from './ml/user-segmentation'
import { PredictionModel } from './ml/prediction-model'
import type { UserBehaviorData } from './ml/user-segmentation'

// Define types for behavior metrics and patterns
interface UserBehaviorMetric {
  user_id: string
  organization_id?: string
  timestamp: string
  action_type: string
  engagement_score?: number
  response_time_ms?: number
  session_duration?: number
  device_type?: string
  success?: boolean
}

interface NotificationPattern {
  pattern_id: string
  pattern_type: string
  organization_id?: string
  user_id?: string
  pattern_data: Record<string, unknown>
  confidence_score: number
  frequency_detected: number
  last_detected_at: string
  conditions: Record<string, unknown>
  outcomes?: Record<string, unknown>
  is_active: boolean
}

interface AnomalyDetectionRow {
  anomaly_id: string
  organization_id?: string
  user_id?: string
  anomaly_type: string
  severity: string
  anomaly_score: number
  detection_method: string
  baseline_data: Record<string, unknown>
  anomalous_data: Record<string, unknown>
  affected_metrics: string[]
  recommended_actions: string[]
  investigation_status: string
  is_resolved: boolean
  type?: string
  score?: number
  method?: string
  baseline?: Record<string, unknown>
  anomalous?: Record<string, unknown>
  affectedMetrics?: string[]
  recommendedActions?: string[]
}

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
      this.supabase = await createSupabaseServerClient() as any
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
        { 
          sensitivity, 
          thresholds: { zScore: { high: 2.5, medium: 2.0, low: 1.5 }, ratio: { high: 0.8, medium: 0.6, low: 0.4 } }, 
          methods: ['volume'],
          timeWindow: { baseline: lookbackDays * 2, analysis: lookbackDays }
        }
      )

      // Store anomaly detections
      const storedAnomalies = await this.storeAnomalies(Array.from(anomalies) as unknown as AnomalyDetectionRow[], organizationId, userId)

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
        const { data: orgMembers } = await ((await this.getSupabase()) as any)
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('status', 'active')

        userIds = orgMembers?.map((m: Record<string, unknown>) => m.user_id as string) || []
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
      const prediction = await (this.predictionModel as any).predictOptimalTiming(
        behaviorData,
        profile,
        notificationType
      )

      return prediction || this.getDefaultOptimalTiming(notificationType)

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
      const analysis = await (this.timeSeriesAnalysis as any).analyzeTrend(timeSeriesData) || {
        trend: 'stable' as const,
        changeRate: 0,
        seasonalityDetected: false,
        forecast: [],
        confidence: 0,
        insights: []
      }

      return {
        ...analysis,
        forecast: (analysis.forecast as TimeSeriesData[]) || [],
        insights: Array.from(analysis.insights || [])
      }

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
      const { data: benchmarks } = await ((await this.getSupabase()) as any)
        .from('board_benchmarks')
        .select('*')
        .eq('industry', industry)
        .eq('organization_size', organizationSize)
        .eq('is_active', true)

      if (!benchmarks || benchmarks.length === 0) {
        throw new Error('No benchmark data available for this industry/size combination')
      }

      // Compare metrics against benchmarks
      const comparison = await (this.statisticalAnalysis as any).compareAgainstBenchmarks(
        orgMetrics,
        benchmarks
      )

      return comparison || {
        metrics: [],
        overallScore: 0,
        riskAreas: [],
        strengths: []
      }

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

    let query = ((await this.getSupabase()) as any)
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
    const hourlyData = (this.statisticalAnalysis as any).groupByTimeOfDay(behaviorData)
    const dailyData = (this.statisticalAnalysis as any).groupByDayOfWeek(behaviorData)

    const patterns: PatternAnalysisResult[] = []

    // Analyze peak engagement hours
    const peakHours = (this.statisticalAnalysis as any).findPeakEngagementTimes(hourlyData)
    if (peakHours?.confidence && peakHours.confidence > 0.7) {
      patterns.push({
        patternId: `timing-peak-hours-${Date.now()}`,
        patternType: 'timing',
        confidence: peakHours.confidence,
        description: `Peak engagement occurs at ${peakHours.hours?.join(', ') || 'certain'} hours`,
        parameters: { 
          type: 'timing' as const, 
          optimalHours: peakHours.hours || [], 
          timezone: 'UTC', 
          weekdays: [1, 2, 3, 4, 5] 
        },
        recommendations: [
          `Schedule important notifications during peak hours: ${peakHours.hours?.join(', ') || 'optimal times'}`,
          'Avoid sending notifications during low-engagement periods'
        ],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    const weeklyPattern = (this.statisticalAnalysis as any).analyzeWeeklyPattern(dailyData)
    if (weeklyPattern?.confidence && weeklyPattern.confidence > 0.6) {
      patterns.push({
        patternId: `timing-weekly-${Date.now()}`,
        patternType: 'timing',
        confidence: weeklyPattern.confidence,
        description: `Weekly engagement pattern: ${weeklyPattern.description || 'Pattern detected'}`,
        parameters: weeklyPattern.parameters || { type: 'timing' as const, optimalHours: [], timezone: 'UTC', weekdays: [] },
        recommendations: weeklyPattern.recommendations || [],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    const responseTimeAnalysis = (this.statisticalAnalysis as any).analyzeResponseTimes(behaviorData)
    if (responseTimeAnalysis?.confidence && responseTimeAnalysis.confidence > 0.65) {
      patterns.push({
        patternId: `engagement-response-time-${Date.now()}`,
        patternType: 'engagement',
        confidence: responseTimeAnalysis.confidence,
        description: responseTimeAnalysis.description || 'Response time pattern detected',
        parameters: responseTimeAnalysis.parameters || { type: 'engagement' as const, avgResponseTime: 0, peakDays: [], channels: [] },
        recommendations: responseTimeAnalysis.recommendations || [],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    const engagementTrends = (this.statisticalAnalysis as any).analyzeEngagementTrends(behaviorData)
    if (engagementTrends?.confidence && engagementTrends.confidence > 0.6) {
      patterns.push({
        patternId: `engagement-trends-${Date.now()}`,
        patternType: 'engagement',
        confidence: engagementTrends.confidence,
        description: engagementTrends.description || 'Engagement trend pattern detected',
        parameters: engagementTrends.parameters || { type: 'engagement' as const, avgResponseTime: 0, peakDays: [], channels: [] },
        recommendations: engagementTrends.recommendations || [],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    const contentAnalysis = (this.statisticalAnalysis as any).analyzeContentEngagement(behaviorData)
    
    const patterns: PatternAnalysisResult[] = []

    if (contentAnalysis?.confidence && contentAnalysis.confidence > 0.6) {
      patterns.push({
        patternId: `content-preferences-${Date.now()}`,
        patternType: 'content',
        confidence: contentAnalysis.confidence,
        description: contentAnalysis.description || 'Content preference pattern detected',
        parameters: contentAnalysis.parameters || { type: 'content' as const, preferredTypes: [], sentiment: 'neutral' as const, topics: [] },
        recommendations: contentAnalysis.recommendations || [],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    const frequencyAnalysis = (this.statisticalAnalysis as any).analyzeOptimalFrequency(behaviorData)
    
    const patterns: PatternAnalysisResult[] = []

    if (frequencyAnalysis?.confidence && frequencyAnalysis.confidence > 0.65) {
      patterns.push({
        patternId: `frequency-optimization-${Date.now()}`,
        patternType: 'frequency',
        confidence: frequencyAnalysis.confidence,
        description: frequencyAnalysis.description || 'Frequency optimization pattern detected',
        parameters: frequencyAnalysis.parameters || { type: 'frequency' as const, optimalFrequency: 1, maxDaily: 3, quietHours: [] },
        recommendations: frequencyAnalysis.recommendations || [],
        affectedUsers: Array.from(new Set(behaviorData.map(d => d.user_id))),
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
    // Store patterns - implementation would depend on actual database schema
    try {
      for (const pattern of patterns) {
        console.log('Pattern detected:', pattern.patternId, pattern.description)
        // Actual database storage would go here
      }
    } catch (error) {
      console.error('Error storing patterns:', error)
    }
  }

  private async storeAnomalies(
    anomalies: AnomalyDetectionRow[],
    organizationId?: string,
    userId?: string
  ): Promise<AnomalyDetectionRow[]> {
    // Store anomalies - implementation would depend on actual database schema
    const storedAnomalies: AnomalyDetectionRow[] = []
    
    try {
      for (const anomaly of anomalies) {
        console.log('Anomaly detected:', anomaly.anomaly_type || anomaly.type, anomaly.severity)
        // Actual database storage would go here
        storedAnomalies.push(anomaly)
      }
    } catch (error) {
      console.error('Error storing anomalies:', error)
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
    const preferredTimes = (this.statisticalAnalysis as any).findUserPreferredTimes(behaviorData) || []
    
    // Analyze response patterns
    const responsePatterns = (this.statisticalAnalysis as any).analyzeUserResponsePatterns(behaviorData) || {
      averageResponseTime: 0,
      peakEngagementDays: [],
      preferredNotificationTypes: []
    }
    
    // Segment user based on engagement level
    const behaviorSegment = (this.userSegmentation as any).segmentUser(behaviorData) || 'moderate'
    
    // Identify risk factors
    const riskFactors = (this.anomalyDetection as any).identifyUserRiskFactors(behaviorData) || []

    return {
      userId,
      preferredTimes: Array.from(preferredTimes),
      responsePatterns: {
        averageResponseTime: responsePatterns.averageResponseTime,
        peakEngagementDays: Array.from(responsePatterns.peakEngagementDays),
        preferredNotificationTypes: Array.from(responsePatterns.preferredNotificationTypes)
      },
      behaviorSegment,
      riskFactors: Array.from(riskFactors)
    }
  }

  private getDefaultOptimalTiming(notificationType: string) {
    // Default timing recommendations based on best practices
    const defaults: Record<string, unknown> = {
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
      const supabase = await this.getSupabase()
      if (!supabase) throw new Error('Failed to initialize database connection')
      
      const { data } = await supabase
        .from('meetings')
        .select('scheduled_start')
        .eq('organization_id', organizationId)
        .gte('scheduled_start', cutoffDate.toISOString())
        .order('scheduled_start')

      // Group by day and count meetings
      const dailyCounts = new Map<string, number>() as Map<string, number>
      data?.forEach((meeting: any) => {
        const day = (meeting?.scheduled_start as string)?.split('T')[0]
        if (day) {
          dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1)
        }
      })

      const entries = Array.from(dailyCounts.entries()) as Array<[string, number]>;
      return entries.map((entry: [string, number]) => {
        const [day, count] = entry;
        return {
          timestamp: new Date(day),
          value: count
        };
      })
    }

    return []
  }

  private async getOrganizationMetrics(organizationId: string): Promise<Record<string, number>> {
    // Get various organization metrics for benchmark comparison
    const metrics: Record<string, number> = {}

    // Meeting frequency (annual)
    const supabase = await this.getSupabase()
    if (!supabase) throw new Error('Failed to initialize database connection')
    
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('scheduled_start', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

    metrics.meeting_frequency_annual = meetings?.length || 0

    // Document volume (monthly average)    
    const { data: documents } = await supabase
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