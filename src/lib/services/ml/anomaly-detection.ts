/**
 * Anomaly Detection Module
 * Implements various anomaly detection algorithms for user behavior analysis
 */

import { StatisticalAnalysis } from './statistical-analysis'

export interface AnomalyResult {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  score: number
  method: string
  baseline: any
  anomalous: any
  affectedMetrics: string[]
  recommendedActions: string[]
  description: string
}

export interface BehaviorProfile {
  userId: string
  normalPatterns: {
    hourlyActivity: Record<string, number>
    dailyActivity: Record<string, number>
    responseTimeRange: [number, number]
    engagementRange: [number, number]
    commonActionTypes: string[]
  }
  thresholds: {
    responseTime: { min: number; max: number }
    engagement: { min: number; max: number }
    frequency: { min: number; max: number }
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
    baselineData: any[],
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = []

    // Build baseline profile
    const baseline = this.buildBaselineProfile(baselineData)
    
    // Detect various types of anomalies
    const volumeAnomalies = this.detectVolumeAnomalies(baseline, recentData, sensitivity)
    const timingAnomalies = this.detectTimingAnomalies(baseline, recentData, sensitivity)
    const engagementAnomalies = this.detectEngagementAnomalies(baseline, recentData, sensitivity)
    const sequenceAnomalies = this.detectSequenceAnomalies(baseline, recentData, sensitivity)
    const velocityAnomalies = this.detectVelocityAnomalies(baseline, recentData, sensitivity)

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
  private buildBaselineProfile(data: any[]): {
    stats: Record<string, any>
    patterns: Record<string, any>
    thresholds: Record<string, any>
  } {
    if (data.length === 0) {
      return { stats: {}, patterns: {}, thresholds: {} }
    }

    // Calculate basic statistics
    const responseTimes = data
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms)
    
    const engagementScores = data
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score)

    const dailyCounts = this.groupByDay(data)
    const hourlyCounts = this.groupByHour(data)
    const actionTypes = data.map(d => d.action_type)

    const stats = {
      responseTime: this.statisticalAnalysis.calculateDescriptiveStats(responseTimes),
      engagement: this.statisticalAnalysis.calculateDescriptiveStats(engagementScores),
      dailyVolume: this.statisticalAnalysis.calculateDescriptiveStats(Object.values(dailyCounts)),
      hourlyVolume: this.statisticalAnalysis.calculateDescriptiveStats(Object.values(hourlyCounts))
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

    return { stats, patterns, thresholds }
  }

  /**
   * Detect volume anomalies (unusual activity levels)
   */
  private detectVolumeAnomalies(
    baseline: any,
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high'
  ): AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (recentData.length === 0 || !baseline.stats.dailyVolume) {
      return anomalies
    }

    // Group recent data by day
    const recentDailyCounts = this.groupByDay(recentData)
    const recentDailyValues = Object.values(recentDailyCounts)
    
    const sensitivityMultipliers = { low: 3, medium: 2, high: 1.5 }
    const multiplier = sensitivityMultipliers[sensitivity]

    for (const [day, count] of Object.entries(recentDailyCounts)) {
      const zScore = this.calculateZScore(count, baseline.stats.dailyVolume.mean, baseline.stats.dailyVolume.stdDev)
      
      if (Math.abs(zScore) > multiplier) {
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
          description: `${isSpike ? 'Unusual spike' : 'Unusual drop'} in daily activity: ${count} vs expected ~${baseline.stats.dailyVolume.mean.toFixed(0)}`
        })
      }
    }

    return anomalies
  }

  /**
   * Detect timing anomalies (unusual time patterns)
   */
  private detectTimingAnomalies(
    baseline: any,
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high'
  ): AnomalyResult[] {
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
    const thresholds = { low: 0.6, medium: 0.4, high: 0.3 }

    if (unusualActivityRatio > thresholds[sensitivity]) {
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
        description: `${(unusualActivityRatio * 100).toFixed(1)}% of recent activity occurred during historically low-activity hours`
      })
    }

    return anomalies
  }

  /**
   * Detect engagement anomalies
   */
  private detectEngagementAnomalies(
    baseline: any,
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high'
  ): AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    const recentEngagementScores = recentData
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score)

    if (recentEngagementScores.length === 0 || !baseline.stats.engagement) {
      return anomalies
    }

    const recentAvgEngagement = recentEngagementScores.reduce((sum, score) => sum + score, 0) / recentEngagementScores.length
    const baselineAvg = baseline.stats.engagement.mean
    const baselineStdDev = baseline.stats.engagement.stdDev

    const zScore = this.calculateZScore(recentAvgEngagement, baselineAvg, baselineStdDev)
    const sensitivityThresholds = { low: 2.5, medium: 2, high: 1.5 }

    if (Math.abs(zScore) > sensitivityThresholds[sensitivity]) {
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
        description: `${isDecrease ? 'Significant decline' : 'Notable increase'} in user engagement: ${(recentAvgEngagement * 100).toFixed(1)}% vs baseline ${(baselineAvg * 100).toFixed(1)}%`
      })
    }

    return anomalies
  }

  /**
   * Detect sequence anomalies (unusual action sequences)
   */
  private detectSequenceAnomalies(
    baseline: any,
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high'
  ): AnomalyResult[] {
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
      const thresholds = { low: 0.7, medium: 0.5, high: 0.3 }

      if (unusualRatio > thresholds[sensitivity]) {
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
          description: `${(unusualRatio * 100).toFixed(1)}% of recent action sequences are unusual compared to historical patterns`
        })
      }
    }

    return anomalies
  }

  /**
   * Detect velocity anomalies (unusual speed of actions)
   */
  private detectVelocityAnomalies(
    baseline: any,
    recentData: any[],
    sensitivity: 'low' | 'medium' | 'high'
  ): AnomalyResult[] {
    const anomalies: AnomalyResult[] = []
    
    if (!baseline.stats.responseTime || recentData.length === 0) {
      return anomalies
    }

    const recentResponseTimes = recentData
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms)

    if (recentResponseTimes.length === 0) {
      return anomalies
    }

    const recentAvgResponseTime = recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
    const baselineAvg = baseline.stats.responseTime.mean
    const baselineStdDev = baseline.stats.responseTime.stdDev

    const zScore = this.calculateZScore(recentAvgResponseTime, baselineAvg, baselineStdDev)
    const sensitivityThresholds = { low: 2.5, medium: 2, high: 1.5 }

    if (Math.abs(zScore) > sensitivityThresholds[sensitivity]) {
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
        description: `Significant change in response velocity: ${(recentAvgResponseTime / 1000 / 60).toFixed(1)} min vs baseline ${(baselineAvg / 1000 / 60).toFixed(1)} min`
      })
    }

    return anomalies
  }

  /**
   * Identify risk factors for specific users
   */
  identifyUserRiskFactors(behaviorData: any[]): string[] {
    const riskFactors: string[] = []
    
    if (behaviorData.length === 0) {
      return ['Insufficient data for risk assessment']
    }

    // Check for declining engagement trend
    const engagementScores = behaviorData
      .filter(d => d.engagement_score !== null)
      .map(d => ({ score: d.engagement_score, timestamp: new Date(d.timestamp) }))
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
      .map(d => d.response_time_ms)
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const hoursToRespond = avgResponseTime / (1000 * 60 * 60)
      
      if (hoursToRespond > 24) {
        riskFactors.push('Very slow response times')
      }
    }

    // Check for low overall activity
    const daysCovered = new Set(behaviorData.map(d => new Date(d.timestamp).toDateString())).size
    const avgActionsPerDay = behaviorData.length / daysCovered
    
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

  // Helper methods

  private groupByDay(data: any[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    data.forEach(item => {
      const day = new Date(item.timestamp).toISOString().split('T')[0]
      grouped[day] = (grouped[day] || 0) + 1
    })
    return grouped
  }

  private groupByHour(data: any[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    data.forEach(item => {
      const hour = new Date(item.timestamp).getHours().toString()
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
    
    return hours.filter(hour => hourlyCounts[hour.toString()] > threshold)
  }

  private findPeakActivityDays(dailyCounts: Record<string, number>): string[] {
    const days = Object.keys(dailyCounts)
    const counts = Object.values(dailyCounts)
    
    if (counts.length === 0) return []
    
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const threshold = avgCount * 1.3 // 30% above average
    
    return days.filter(day => dailyCounts[day] > threshold)
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

  private analyzeSessionPatterns(data: any[]): any {
    // Group by session_id if available
    const sessions: Record<string, any[]> = {}
    data.forEach(item => {
      const sessionId = item.session_id || 'default'
      if (!sessions[sessionId]) sessions[sessionId] = []
      sessions[sessionId].push(item)
    })
    
    const sessionLengths = Object.values(sessions).map(session => session.length)
    return {
      averageSessionLength: sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length,
      totalSessions: Object.keys(sessions).length
    }
  }

  private extractActionSequences(data: any[], sequenceLength: number): string[] {
    const sequences: string[] = []
    
    for (let i = 0; i <= data.length - sequenceLength; i++) {
      const sequence = data.slice(i, i + sequenceLength)
        .map(item => item.action_type)
        .join(' -> ')
      sequences.push(sequence)
    }
    
    return sequences
  }

  private isSequenceCommon(sequence: string, commonActions: string[]): boolean {
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