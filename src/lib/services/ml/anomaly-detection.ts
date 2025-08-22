/**
 * Anomaly Detection Module
 * Implements various anomaly detection algorithms for user behavior analysis
 */

import { StatisticalAnalysis } from './statistical-analysis'
import { UserBehaviorData } from './user-segmentation'

export interface AnomalyResult {
  readonly type: string
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly score: number
  readonly method: string
  readonly baseline: Record<string, unknown>
  readonly anomalous: Record<string, unknown>
  readonly affectedMetrics: readonly string[]
  readonly recommendedActions: readonly string[]
  readonly description: string
  readonly timestamp: Date
  readonly confidence: number
}

export interface BehaviorProfile {
  readonly userId: string
  readonly normalPatterns: {
    readonly hourlyActivity: Record<string, number>
    readonly dailyActivity: Record<string, number>
    readonly responseTimeRange: readonly [number, number]
    readonly engagementRange: readonly [number, number]
    readonly commonActionTypes: readonly string[]
  }
  readonly thresholds: {
    readonly responseTime: { readonly min: number; readonly max: number }
    readonly engagement: { readonly min: number; readonly max: number }
    readonly frequency: { readonly min: number; readonly max: number }
  }
  readonly profileCreated: Date
  readonly lastUpdated: Date
  readonly dataQuality: {
    readonly completeness: number // 0-1 scale
    readonly consistency: number // 0-1 scale
    readonly sampleSize: number
  }
}

// Statistical baseline for anomaly detection
export interface StatisticalBaseline {
  readonly stats: Record<string, {
    readonly mean: number
    readonly stdDev: number
    readonly min: number
    readonly max: number
    readonly median: number
    readonly q25: number
    readonly q75: number
  }>
  readonly patterns: Record<string, unknown>
  readonly thresholds: Record<string, {
    readonly min: number
    readonly max: number
  }>
  readonly sampleSize: number
  readonly createdAt: Date
}

// Anomaly detection configuration
export interface AnomalyDetectionConfig {
  readonly sensitivity: 'low' | 'medium' | 'high'
  readonly methods: readonly ('volume' | 'timing' | 'engagement' | 'sequence' | 'velocity')[]
  readonly timeWindow: {
    readonly baseline: number // days
    readonly analysis: number // days
  }
  readonly thresholds: {
    readonly zScore: Record<'low' | 'medium' | 'high', number>
    readonly ratio: Record<'low' | 'medium' | 'high', number>
  }
  readonly exclusions?: {
    readonly ignoredHours?: readonly number[]
    readonly ignoredDays?: readonly number[]
    readonly ignoredActionTypes?: readonly string[]
  }
}

export class AnomalyDetection {
  private statisticalAnalysis: StatisticalAnalysis

  constructor() {
    this.statisticalAnalysis = new StatisticalAnalysis()
  }

  /**
   * Main anomaly detection method
   */
  async detectAnomalies(
    baselineData: readonly UserBehaviorData[],
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig = {
      sensitivity: 'medium',
      methods: ['volume', 'timing', 'engagement', 'sequence', 'velocity'],
      timeWindow: { baseline: 30, analysis: 7 },
      thresholds: {
        zScore: { low: 3, medium: 2, high: 1.5 },
        ratio: { low: 0.7, medium: 0.5, high: 0.3 }
      }
    }
  ): Promise<readonly AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []

    // Build baseline profile
    const baseline = this.buildBaselineProfile(baselineData)
    
    // Detect various types of anomalies based on enabled methods
    const volumeAnomalies = config.methods.includes('volume') 
      ? this.detectVolumeAnomalies(baseline, recentData, config) 
      : []
    const timingAnomalies = config.methods.includes('timing')
      ? this.detectTimingAnomalies(baseline, recentData, config)
      : []
    const engagementAnomalies = config.methods.includes('engagement')
      ? this.detectEngagementAnomalies(baseline, recentData, config)
      : []
    const sequenceAnomalies = config.methods.includes('sequence')
      ? this.detectSequenceAnomalies(baseline, recentData, config)
      : []
    const velocityAnomalies = config.methods.includes('velocity')
      ? this.detectVelocityAnomalies(baseline, recentData, config)
      : []

    anomalies.push(...volumeAnomalies)
    anomalies.push(...timingAnomalies)
    anomalies.push(...engagementAnomalies)
    anomalies.push(...sequenceAnomalies)
    anomalies.push(...velocityAnomalies)

    return anomalies.sort((a, b) => b.score - a.score) // Sort by severity
  }

  /**
   * Build baseline behavior profile from historical data
   */
  private buildBaselineProfile(data: readonly UserBehaviorData[]): StatisticalBaseline {
    if (data.length === 0) {
      return {
        stats: {},
        patterns: {},
        thresholds: {},
        sampleSize: 0,
        createdAt: new Date()
      }
    }

    // Calculate basic statistics
    const responseTimes = data
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms!)
      .filter((time): time is number => time !== undefined)
    
    const engagementScores = data
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score!)
      .filter((score): score is number => score !== undefined)

    const dailyCounts = this.groupByDay(data)
    const hourlyCounts = this.groupByHour(data)
    const actionTypes = data.map(d => d.action_type)

    const responseTimeStats = this.statisticalAnalysis.calculateDescriptiveStats(responseTimes)
    const engagementStats = this.statisticalAnalysis.calculateDescriptiveStats(engagementScores)
    const dailyVolumeStats = this.statisticalAnalysis.calculateDescriptiveStats(Object.values(dailyCounts))
    const hourlyVolumeStats = this.statisticalAnalysis.calculateDescriptiveStats(Object.values(hourlyCounts))

    const stats = {
      responseTime: {
        mean: responseTimeStats.mean,
        stdDev: responseTimeStats.stdDev,
        min: responseTimeStats.min,
        max: responseTimeStats.max,
        median: responseTimeStats.median,
        q25: responseTimeStats.percentiles.p25,
        q75: responseTimeStats.percentiles.p75
      },
      engagement: {
        mean: engagementStats.mean,
        stdDev: engagementStats.stdDev,
        min: engagementStats.min,
        max: engagementStats.max,
        median: engagementStats.median,
        q25: engagementStats.percentiles.p25,
        q75: engagementStats.percentiles.p75
      },
      dailyVolume: {
        mean: dailyVolumeStats.mean,
        stdDev: dailyVolumeStats.stdDev,
        min: dailyVolumeStats.min,
        max: dailyVolumeStats.max,
        median: dailyVolumeStats.median,
        q25: dailyVolumeStats.percentiles.p25,
        q75: dailyVolumeStats.percentiles.p75
      },
      hourlyVolume: {
        mean: hourlyVolumeStats.mean,
        stdDev: hourlyVolumeStats.stdDev,
        min: hourlyVolumeStats.min,
        max: hourlyVolumeStats.max,
        median: hourlyVolumeStats.median,
        q25: hourlyVolumeStats.percentiles.p25,
        q75: hourlyVolumeStats.percentiles.p75
      }
    }

    const patterns = {
      peakHours: this.findPeakActivityHours(hourlyCounts),
      peakDays: this.findPeakActivityDays(dailyCounts),
      commonActions: this.findCommonActionTypes(actionTypes),
      sessionPatterns: this.analyzeSessionPatterns(data)
    }

    const thresholds = {
      responseTime: {
        min: Math.max(0, stats.responseTime.mean - 2 * stats.responseTime.stdDev),
        max: stats.responseTime.mean + 2 * stats.responseTime.stdDev
      },
      engagement: {
        min: Math.max(0, stats.engagement.mean - 2 * stats.engagement.stdDev),
        max: stats.engagement.mean + 2 * stats.engagement.stdDev
      },
      dailyVolume: {
        min: Math.max(0, stats.dailyVolume.mean - 2 * stats.dailyVolume.stdDev),
        max: stats.dailyVolume.mean + 2 * stats.dailyVolume.stdDev
      }
    }

    return { 
      stats, 
      patterns, 
      thresholds,
      sampleSize: data.length,
      createdAt: new Date()
    }
  }

  /**
   * Detect volume anomalies (unusual activity levels)
   */
  private detectVolumeAnomalies(
    baseline: StatisticalBaseline,
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig
  ): readonly AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (recentData.length === 0 || !baseline.stats.dailyVolume) {
      return anomalies
    }

    // Group recent data by day
    const recentDailyCounts = this.groupByDay(recentData)
    const recentDailyValues = Object.values(recentDailyCounts)
    
    const threshold = config.thresholds.zScore[config.sensitivity]

    for (const [day, count] of Object.entries(recentDailyCounts)) {
      const zScore = this.calculateZScore(count, baseline.stats.dailyVolume.mean, baseline.stats.dailyVolume.stdDev)
      
      if (Math.abs(zScore) > threshold) {
        const isSpike = count > baseline.stats.dailyVolume.mean
        
        anomalies.push({
          type: isSpike ? 'volume_spike' : 'volume_drop',
          severity: this.calculateSeverity(Math.abs(zScore)),
          score: Math.abs(zScore),
          method: 'z_score_analysis',
          baseline: {
            averageDailyVolume: baseline.stats.dailyVolume.mean,
            standardDeviation: baseline.stats.dailyVolume.stdDev
          },
          anomalous: {
            day,
            actualVolume: count,
            expectedRange: [
              baseline.stats.dailyVolume.mean - baseline.stats.dailyVolume.stdDev,
              baseline.stats.dailyVolume.mean + baseline.stats.dailyVolume.stdDev
            ]
          },
          affectedMetrics: ['daily_activity_volume'],
          recommendedActions: isSpike ? [
            'Investigate cause of increased activity',
            'Monitor for system performance impact',
            'Check if spike corresponds to business events'
          ] : [
            'Investigate reason for decreased activity',
            'Check for system issues or user problems',
            'Consider user engagement initiatives'
          ],
          description: `${isSpike ? 'Unusual spike' : 'Unusual drop'} in daily activity: ${count} vs expected ~${baseline.stats.dailyVolume.mean.toFixed(0)}`,
          timestamp: new Date(),
          confidence: Math.min(Math.abs(zScore) / 5, 1) // Scale confidence based on z-score
        })
      }
    }

    return anomalies
  }

  /**
   * Detect timing anomalies (unusual time patterns)
   */
  private detectTimingAnomalies(
    baseline: StatisticalBaseline,
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig
  ): readonly AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (!baseline.patterns.peakHours || recentData.length === 0) {
      return anomalies
    }

    const recentHourlyCounts = this.groupByHour(recentData)
    const baselinePeakHours = baseline.patterns.peakHours
    
    // Check if recent activity is happening during unusual hours
    const totalRecentActivity = Object.values(recentHourlyCounts).reduce((sum: number, count) => sum + count, 0)
    let unusualHourActivity = 0
    
    for (const [hour, count] of Object.entries(recentHourlyCounts)) {
      if (!baselinePeakHours.includes(parseInt(hour))) {
        unusualHourActivity += count
      }
    }

    const unusualActivityRatio = unusualHourActivity / totalRecentActivity
    const threshold = config.thresholds.ratio[config.sensitivity]

    if (unusualActivityRatio > threshold) {
      anomalies.push({
        type: 'timing_deviation',
        severity: this.calculateSeverityFromRatio(unusualActivityRatio),
        score: unusualActivityRatio * 10,
        method: 'timing_pattern_analysis',
        baseline: {
          peakHours: baselinePeakHours,
          normalHourlyPattern: baseline.patterns.peakHours
        },
        anomalous: {
          unusualActivityRatio,
          recentHourlyDistribution: recentHourlyCounts
        },
        affectedMetrics: ['activity_timing'],
        recommendedActions: [
          'Investigate why activity is happening during off-hours',
          'Check for automated processes or external triggers',
          'Verify user time zones and working hours'
        ],
        description: `${(unusualActivityRatio * 100).toFixed(1)}% of recent activity occurred during historically low-activity hours`,
        timestamp: new Date(),
        confidence: Math.min(unusualActivityRatio * 2, 1)
      })
    }

    return anomalies
  }

  /**
   * Detect engagement anomalies
   */
  private detectEngagementAnomalies(
    baseline: StatisticalBaseline,
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig
  ): readonly AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    const recentEngagementScores = recentData
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score!)
      .filter((score): score is number => score !== undefined)

    if (recentEngagementScores.length === 0 || !baseline.stats.engagement) {
      return anomalies
    }

    const recentAvgEngagement = recentEngagementScores.reduce((sum, score) => sum + (score ?? 0), 0) / recentEngagementScores.length
    const baselineAvg = baseline.stats.engagement.mean
    const baselineStdDev = baseline.stats.engagement.stdDev

    const zScore = this.calculateZScore(recentAvgEngagement, baselineAvg, baselineStdDev)
    const threshold = config.thresholds.zScore[config.sensitivity]

    if (Math.abs(zScore) > threshold) {
      const isDecrease = recentAvgEngagement < baselineAvg
      
      anomalies.push({
        type: isDecrease ? 'engagement_decline' : 'engagement_surge',
        severity: this.calculateSeverity(Math.abs(zScore)),
        score: Math.abs(zScore),
        method: 'engagement_analysis',
        baseline: {
          averageEngagement: baselineAvg,
          standardDeviation: baselineStdDev
        },
        anomalous: {
          recentAverageEngagement: recentAvgEngagement,
          changePercentage: ((recentAvgEngagement - baselineAvg) / baselineAvg) * 100
        },
        affectedMetrics: ['user_engagement'],
        recommendedActions: isDecrease ? [
          'Investigate causes of decreased engagement',
          'Review recent notification content and timing',
          'Consider user feedback surveys',
          'Analyze specific low-engagement user segments'
        ] : [
          'Analyze what contributed to increased engagement',
          'Consider scaling successful engagement strategies',
          'Monitor sustainability of engagement increase'
        ],
        description: `${isDecrease ? 'Significant decline' : 'Notable increase'} in user engagement: ${(recentAvgEngagement * 100).toFixed(1)}% vs baseline ${(baselineAvg * 100).toFixed(1)}%`,
        timestamp: new Date(),
        confidence: Math.min(Math.abs(zScore) / 4, 1)
      })
    }

    return anomalies
  }

  /**
   * Detect sequence anomalies (unusual action sequences)
   */
  private detectSequenceAnomalies(
    baseline: StatisticalBaseline,
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig
  ): readonly AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (recentData.length < 5) {
      return anomalies
    }

    // Analyze action sequences
    const recentSequences = this.extractActionSequences(recentData, 3) // 3-action sequences
    const baselineSequences = baseline.patterns.commonActions || []
    
    // Find sequences that are unusual
    const unusualSequences = recentSequences.filter(seq => {
      return !this.isSequenceCommon(seq, baselineSequences)
    })

    if (unusualSequences.length > 0) {
      const unusualRatio = unusualSequences.length / recentSequences.length
      const threshold = config.thresholds.ratio[config.sensitivity]

      if (unusualRatio > threshold) {
        anomalies.push({
          type: 'sequence_anomaly',
          severity: this.calculateSeverityFromRatio(unusualRatio),
          score: unusualRatio * 10,
          method: 'sequence_analysis',
          baseline: {
            commonSequences: baselineSequences.slice(0, 10) // Top 10
          },
          anomalous: {
            unusualSequences: unusualSequences.slice(0, 5), // Top 5
            unusualSequenceRatio: unusualRatio
          },
          affectedMetrics: ['action_sequences'],
          recommendedActions: [
            'Analyze user workflow changes',
            'Check for new features or UI changes affecting behavior',
            'Investigate if unusual sequences indicate user confusion',
            'Consider user experience improvements'
          ],
          description: `${(unusualRatio * 100).toFixed(1)}% of recent action sequences are unusual compared to historical patterns`,
          timestamp: new Date(),
          confidence: Math.min(unusualRatio * 2, 1)
        })
      }
    }

    return anomalies
  }

  /**
   * Detect velocity anomalies (unusual speed of actions)
   */
  private detectVelocityAnomalies(
    baseline: StatisticalBaseline,
    recentData: readonly UserBehaviorData[],
    config: AnomalyDetectionConfig
  ): readonly AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (!baseline.stats.responseTime || recentData.length === 0) {
      return anomalies
    }

    const recentResponseTimes = recentData
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms!)
      .filter((time): time is number => time !== undefined)

    if (recentResponseTimes.length === 0) {
      return anomalies
    }

    const recentAvgResponseTime = recentResponseTimes.reduce((sum, time) => sum + (time ?? 0), 0) / recentResponseTimes.length
    const baselineAvg = baseline.stats.responseTime.mean
    const baselineStdDev = baseline.stats.responseTime.stdDev

    const zScore = this.calculateZScore(recentAvgResponseTime, baselineAvg, baselineStdDev)
    const threshold = config.thresholds.zScore[config.sensitivity]

    if (Math.abs(zScore) > threshold) {
      const isFaster = recentAvgResponseTime < baselineAvg
      
      anomalies.push({
        type: isFaster ? 'velocity_increase' : 'velocity_decrease',
        severity: this.calculateSeverity(Math.abs(zScore)),
        score: Math.abs(zScore),
        method: 'velocity_analysis',
        baseline: {
          averageResponseTime: baselineAvg,
          standardDeviation: baselineStdDev
        },
        anomalous: {
          recentAverageResponseTime: recentAvgResponseTime,
          changePercentage: ((recentAvgResponseTime - baselineAvg) / baselineAvg) * 100
        },
        affectedMetrics: ['response_velocity'],
        recommendedActions: isFaster ? [
          'Investigate cause of faster response times',
          'Check if users are behaving more efficiently',
          'Verify data accuracy (could indicate bot activity)',
          'Consider if this indicates improved user experience'
        ] : [
          'Investigate causes of slower response times',
          'Check for system performance issues',
          'Analyze user workflow bottlenecks',
          'Consider user training or interface improvements'
        ],
        description: `Significant change in response velocity: ${(recentAvgResponseTime / 1000 / 60).toFixed(1)} min vs baseline ${(baselineAvg / 1000 / 60).toFixed(1)} min`,
        timestamp: new Date(),
        confidence: Math.min(Math.abs(zScore) / 4, 1)
      })
    }

    return anomalies
  }

  /**
   * Identify risk factors for specific users
   */
  identifyUserRiskFactors(behaviorData: readonly UserBehaviorData[]): readonly string[] {
    const riskFactors: string[] = []
    
    if (behaviorData.length === 0) {
      return ['Insufficient data for risk assessment']
    }

    // Check for declining engagement trend
    const engagementScores = behaviorData
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => ({ 
        score: d.engagement_score!, 
        timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    if (engagementScores.length >= 10) {
      const recentEngagement = engagementScores.slice(-5).map(e => e.score)
      const earlierEngagement = engagementScores.slice(0, 5).map(e => e.score)
      
      const recentAvg = recentEngagement.reduce((sum, score) => sum + score, 0) / recentEngagement.length
      const earlierAvg = earlierEngagement.reduce((sum, score) => sum + score, 0) / earlierEngagement.length
      
      if (recentAvg < earlierAvg * 0.8) {
        riskFactors.push('Declining engagement trend')
      }
    }

    // Check for irregular activity patterns
    const hourlyCounts = this.groupByHour(behaviorData)
    const hourlyValues = Object.values(hourlyCounts)
    if (hourlyValues.length > 0) {
      const stats = this.statisticalAnalysis.calculateDescriptiveStats(hourlyValues)
      if (stats.stdDev / stats.mean > 1.5) { // High coefficient of variation
        riskFactors.push('Irregular activity patterns')
      }
    }

    // Check for very slow response times
    const responseTimes = behaviorData
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms!)
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const hoursToRespond = avgResponseTime / (1000 * 60 * 60)
      
      if (hoursToRespond > 24) {
        riskFactors.push('Very slow response times')
      }
    }

    // Check for low overall activity
    const daysCovered = new Set(behaviorData.map(d => {
      const timestamp = typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp
      return timestamp.toDateString()
    })).size
    const avgActionsPerDay = daysCovered > 0 ? behaviorData.length / daysCovered : 0
    
    if (avgActionsPerDay < 2) {
      riskFactors.push('Low overall activity level')
    }

    // Check for limited action diversity
    const uniqueActionTypes = new Set(behaviorData.map(d => d.action_type)).size
    if (uniqueActionTypes < 3 && behaviorData.length > 20) {
      riskFactors.push('Limited action diversity')
    }

    return riskFactors.length > 0 ? riskFactors : ['No significant risk factors detected']
  }

  /**
   * Create comprehensive behavior profile for a user
   */
  createUserBehaviorProfile(
    userId: string,
    behaviorData: readonly UserBehaviorData[]
  ): BehaviorProfile {
    if (behaviorData.length === 0) {
      throw new Error('Insufficient data to create behavior profile')
    }

    const responseTimes = behaviorData
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms!)

    const engagementScores = behaviorData
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score!)

    const hourlyActivity = this.groupByHour(behaviorData)
    const dailyActivity = this.groupByDay(behaviorData)
    const actionTypes = behaviorData.map(d => d.action_type)

    // Calculate ranges
    const responseTimeRange: readonly [number, number] = responseTimes.length > 0 
      ? [Math.min(...responseTimes), Math.max(...responseTimes)]
      : [0, 0]

    const engagementRange: readonly [number, number] = engagementScores.length > 0
      ? [Math.min(...engagementScores), Math.max(...engagementScores)]
      : [0, 1]

    // Calculate thresholds (mean ± 2 standard deviations)
    const responseStats = this.statisticalAnalysis.calculateDescriptiveStats(responseTimes)
    const engagementStats = this.statisticalAnalysis.calculateDescriptiveStats(engagementScores)
    const activityStats = this.statisticalAnalysis.calculateDescriptiveStats(Object.values(hourlyActivity))

    return {
      userId,
      normalPatterns: {
        hourlyActivity,
        dailyActivity,
        responseTimeRange,
        engagementRange,
        commonActionTypes: this.findCommonActionTypes(actionTypes)
      },
      thresholds: {
        responseTime: {
          min: Math.max(0, responseStats.mean - 2 * responseStats.stdDev),
          max: responseStats.mean + 2 * responseStats.stdDev
        },
        engagement: {
          min: Math.max(0, engagementStats.mean - 2 * engagementStats.stdDev),
          max: Math.min(1, engagementStats.mean + 2 * engagementStats.stdDev)
        },
        frequency: {
          min: Math.max(0, activityStats.mean - 2 * activityStats.stdDev),
          max: activityStats.mean + 2 * activityStats.stdDev
        }
      },
      profileCreated: new Date(),
      lastUpdated: new Date(),
      dataQuality: {
        completeness: this.calculateDataCompleteness(behaviorData),
        consistency: this.calculateDataConsistency(behaviorData),
        sampleSize: behaviorData.length
      }
    }
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(data: readonly UserBehaviorData[]): number {
    if (data.length === 0) return 0

    let completenessScore = 0
    let totalFields = 0

    data.forEach(record => {
      const fields = [
        record.timestamp,
        record.action_type,
        record.engagement_score,
        record.response_time_ms
      ]

      fields.forEach(field => {
        totalFields++
        if (field !== null && field !== undefined) {
          completenessScore++
        }
      })
    })

    return totalFields > 0 ? completenessScore / totalFields : 0
  }

  /**
   * Calculate data consistency score
   */
  private calculateDataConsistency(data: readonly UserBehaviorData[]): number {
    if (data.length < 2) return 1

    // Check for consistent timestamp ordering
    let consistentOrdering = 0
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i-1]!.timestamp)
      const curr = new Date(data[i]!.timestamp)
      if (curr >= prev) {
        consistentOrdering++
      }
    }

    // Check for reasonable engagement score ranges
    const engagementScores = data
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score!)
    
    const validEngagementScores = engagementScores.filter(score => score >= 0 && score <= 1).length
    const engagementConsistency = engagementScores.length > 0 
      ? validEngagementScores / engagementScores.length 
      : 1

    const orderingConsistency = (data.length - 1) > 0 ? consistentOrdering / (data.length - 1) : 1

    return (orderingConsistency + engagementConsistency) / 2
  }

  // Helper methods

  private groupByDay(data: readonly UserBehaviorData[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    data.forEach(item => {
      const timestamp = typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp
      const day = timestamp.toISOString().split('T')[0]
      if (day) {
        grouped[day] = (grouped[day] || 0) + 1
      }
    })
    return grouped
  }

  private groupByHour(data: readonly UserBehaviorData[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    data.forEach(item => {
      const timestamp = typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp
      const hour = timestamp.getHours().toString()
      grouped[hour] = (grouped[hour] || 0) + 1
    })
    return grouped
  }

  private findPeakActivityHours(hourlyCounts: Record<string, number>): number[] {
    const hours = Object.keys(hourlyCounts).map(h => parseInt(h))
    const counts = Object.values(hourlyCounts)
    
    if (counts.length === 0) return []
    
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const threshold = avgCount * 1.2 // 20% above average
    
    return hours.filter(hour => (hourlyCounts[hour.toString()] ?? 0) > threshold)
  }

  private findPeakActivityDays(dailyCounts: Record<string, number>): string[] {
    const days = Object.keys(dailyCounts)
    const counts = Object.values(dailyCounts)
    
    if (counts.length === 0) return []
    
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const threshold = avgCount * 1.3 // 30% above average
    
    return days.filter(day => (dailyCounts[day] ?? 0) > threshold)
  }

  private findCommonActionTypes(actionTypes: string[]): string[] {
    const frequency: Record<string, number> = {}
    actionTypes.forEach(action => {
      frequency[action] = (frequency[action] || 0) + 1
    })
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10
      .map(([action]) => action)
  }

  private analyzeSessionPatterns(data: readonly UserBehaviorData[]): {
    readonly averageSessionLength: number
    readonly totalSessions: number
  } {
    // Group by session_id if available
    const sessions: Record<string, any[]> = {}
    data.forEach(item => {
      // Use timestamp-based session grouping since session_id may not be available
      const sessionId = 'default'
      if (!sessions[sessionId]) sessions[sessionId] = []
      sessions[sessionId]!.push(item)
    })
    
    const sessionLengths = Object.values(sessions).map(session => session.length)
    return {
      averageSessionLength: sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length,
      totalSessions: Object.keys(sessions).length
    }
  }

  private extractActionSequences(data: readonly UserBehaviorData[], sequenceLength: number): readonly string[] {
    const sequences: string[] = []
    
    for (let i = 0; i <= data.length - sequenceLength; i++) {
      const sequence = data.slice(i, i + sequenceLength)
        .map(item => item.action_type)
        .join(' -> ')
      sequences.push(sequence)
    }
    
    return sequences
  }

  private isSequenceCommon(sequence: string, commonActions: readonly string[]): boolean {
    // Check if the sequence contains common action patterns
    const actions = sequence.split(' -> ')
    return actions.every(action => commonActions.includes(action))
  }

  private calculateZScore(value: number, mean: number, stdDev: number): number {
    return stdDev > 0 ? (value - mean) / stdDev : 0
  }

  private calculateSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore > 4) return 'critical'
    if (zScore > 3) return 'high'
    if (zScore > 2) return 'medium'
    return 'low'
  }

  private calculateSeverityFromRatio(ratio: number): 'low' | 'medium' | 'high' | 'critical' {
    if (ratio > 0.8) return 'critical'
    if (ratio > 0.6) return 'high'
    if (ratio > 0.4) return 'medium'
    return 'low'
  }
}