/**
 * Statistical Analysis Module for Pattern Recognition
 * Implements core statistical algorithms for behavioral analysis
 */

// Type-safe statistical parameters based on analysis type
type StatisticalParameters = 
  | { type: 'descriptive'; mean: number; median: number; stdDev: number; outliers: number }
  | { type: 'correlation'; coefficient: number; pValue: number; significance: 'low' | 'medium' | 'high' }
  | { type: 'trend'; direction: 'up' | 'down' | 'stable'; slope: number; r2: number }
  | { type: 'distribution'; shape: 'normal' | 'skewed' | 'bimodal'; kurtosis: number }
  | Record<string, unknown>;

export interface StatisticalResult {
  readonly confidence: number
  readonly description: string
  readonly parameters: StatisticalParameters
  readonly recommendations: readonly string[]
}

export interface TimeGroupData {
  [key: string]: {
    count: number
    totalEngagement: number
    averageResponseTime: number
    actions: string[]
  }
}

// Import user behavior data type
import type { UserBehaviorData } from './user-segmentation';

export class StatisticalAnalysis {
  
  /**
   * Calculate descriptive statistics for a dataset
   */
  calculateDescriptiveStats(values: number[]): {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    percentiles: { p25: number; p50: number; p75: number; p90: number }
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 } }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      mean,
      median: this.getPercentile(sorted, 50),
      stdDev,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      percentiles: {
        p25: this.getPercentile(sorted, 25),
        p50: this.getPercentile(sorted, 50),
        p75: this.getPercentile(sorted, 75),
        p90: this.getPercentile(sorted, 90)
      }
    }
  }

  /**
   * Calculate percentile value from sorted array
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    
    const index = (percentile / 100) * (sortedValues.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    
    if (lower === upper) {
      return sortedValues[lower] ?? 0
    }
    
    const weight = index - lower
    const lowerValue = sortedValues[lower] ?? 0
    const upperValue = sortedValues[upper] ?? 0
    return lowerValue * (1 - weight) + upperValue * weight
  }

  /**
   * Group behavior data by hour of day
   */
  groupByTimeOfDay(behaviorData: readonly UserBehaviorData[]): TimeGroupData {
    const hourlyData: TimeGroupData = {}

    behaviorData.forEach(data => {
      const hour = new Date(data.timestamp).getHours()
      const hourKey = hour.toString().padStart(2, '0')

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          count: 0,
          totalEngagement: 0,
          averageResponseTime: 0,
          actions: []
        }
      }

      hourlyData[hourKey].count++
      hourlyData[hourKey].totalEngagement += data.engagement_score || 0
      hourlyData[hourKey].averageResponseTime += data.response_time_ms || 0
      hourlyData[hourKey].actions.push(data.action_type)
    })

    // Calculate averages
    Object.keys(hourlyData).forEach(hour => {
      const data = hourlyData[hour]
      if (data && data.count > 0) {
        data.averageResponseTime = data.averageResponseTime / data.count
        data.totalEngagement = data.totalEngagement / data.count
      }
    })

    return hourlyData
  }

  /**
   * Group behavior data by day of week
   */
  groupByDayOfWeek(behaviorData: readonly UserBehaviorData[]): TimeGroupData {
    const dailyData: TimeGroupData = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    behaviorData.forEach(data => {
      const dayOfWeek = new Date(data.timestamp).getDay()
      const dayKey = dayNames[dayOfWeek]

      if (dayKey) {
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = {
            count: 0,
            totalEngagement: 0,
            averageResponseTime: 0,
            actions: []
          }
        }

        const dayData = dailyData[dayKey]!
        dayData.count++
        dayData.totalEngagement += data.engagement_score || 0
        dayData.averageResponseTime += data.response_time_ms || 0
        dayData.actions.push(data.action_type)
      }
    })

    // Calculate averages
    Object.keys(dailyData).forEach(day => {
      const data = dailyData[day]
      if (data && data.count > 0) {
        data.averageResponseTime = data.averageResponseTime / data.count
        data.totalEngagement = data.totalEngagement / data.count
      }
    })

    return dailyData
  }

  /**
   * Find peak engagement times
   */
  findPeakEngagementTimes(hourlyData: TimeGroupData): {
    hours: string[]
    confidence: number
    variance: number
  } {
    const hours = Object.keys(hourlyData).sort()
    const engagementScores = hours.map(hour => hourlyData[hour]?.totalEngagement ?? 0)
    
    if (engagementScores.length === 0) {
      return { hours: [], confidence: 0, variance: 0 }
    }

    const stats = this.calculateDescriptiveStats(engagementScores)
    const threshold = stats.mean + (stats.stdDev * 0.5) // Above mean + 0.5 std dev

    const peakHours = hours.filter(hour => (hourlyData[hour]?.totalEngagement ?? 0) > threshold)
    
    // Calculate confidence based on how distinct the peaks are
    const confidence = Math.min(stats.stdDev / stats.mean, 1) // Higher variance = higher confidence in peaks
    
    return {
      hours: peakHours,
      confidence: isNaN(confidence) ? 0 : confidence,
      variance: stats.stdDev
    }
  }

  /**
   * Analyze weekly engagement patterns
   */
  analyzeWeeklyPattern(dailyData: TimeGroupData): StatisticalResult {
    const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const weekendDays = ['Saturday', 'Sunday']

    const workDayEngagement = workDays
      .filter(day => dailyData[day])
      .map(day => dailyData[day]!.totalEngagement)
    
    const weekendEngagement = weekendDays
      .filter(day => dailyData[day])
      .map(day => dailyData[day]!.totalEngagement)

    if (workDayEngagement.length === 0 && weekendEngagement.length === 0) {
      return {
        confidence: 0,
        description: 'Insufficient data for weekly pattern analysis',
        parameters: {},
        recommendations: []
      }
    }

    const workDayAvg = workDayEngagement.reduce((sum, val) => sum + val, 0) / workDayEngagement.length || 0
    const weekendAvg = weekendEngagement.reduce((sum, val) => sum + val, 0) / weekendEngagement.length || 0

    const difference = Math.abs(workDayAvg - weekendAvg)
    const maxAvg = Math.max(workDayAvg, weekendAvg)
    const confidence = maxAvg > 0 ? Math.min(difference / maxAvg, 1) : 0

    let description = ''
    let recommendations: string[] = []

    if (workDayAvg > weekendAvg * 1.2) {
      description = 'Higher engagement during weekdays'
      recommendations = [
        'Focus important notifications on weekdays',
        'Reduce non-critical notifications on weekends',
        'Schedule board meetings during weekdays for better attendance'
      ]
    } else if (weekendAvg > workDayAvg * 1.2) {
      description = 'Higher engagement during weekends'
      recommendations = [
        'Consider weekend scheduling for time-sensitive notifications',
        'Board members may have more availability on weekends'
      ]
    } else {
      description = 'Similar engagement levels throughout the week'
      recommendations = [
        'Flexible scheduling - no strong day preference detected',
        'Focus on time-of-day optimization instead'
      ]
    }

    return {
      confidence,
      description,
      parameters: {
        workday_average: workDayAvg,
        weekend_average: weekendAvg,
        difference_ratio: difference / (maxAvg || 1)
      },
      recommendations
    }
  }

  /**
   * Analyze response time patterns
   */
  analyzeResponseTimes(behaviorData: readonly UserBehaviorData[]): StatisticalResult {
    const responseTimes = behaviorData
      .filter(data => data.response_time_ms && data.response_time_ms > 0)
      .map(data => data.response_time_ms)

    if (responseTimes.length === 0) {
      return {
        confidence: 0,
        description: 'No response time data available',
        parameters: {},
        recommendations: []
      }
    }

    const stats = this.calculateDescriptiveStats(responseTimes)
    
    // Convert milliseconds to more readable units
    const avgHours = stats.mean / (1000 * 60 * 60)
    const medianHours = stats.median / (1000 * 60 * 60)

    let description = ''
    let recommendations: string[] = []
    let confidence = 0.7 // Base confidence for response time analysis

    if (avgHours < 1) {
      description = 'Very quick response times (under 1 hour average)'
      recommendations = [
        'Users are highly responsive - can send time-sensitive notifications',
        'Consider real-time notifications for urgent matters'
      ]
      confidence = 0.8
    } else if (avgHours < 8) {
      description = `Moderate response times (${avgHours.toFixed(1)} hours average)`
      recommendations = [
        'Allow several hours for response expectations',
        'Schedule follow-up reminders after 4-6 hours if needed'
      ]
    } else if (avgHours < 24) {
      description = `Slower response times (${avgHours.toFixed(1)} hours average)`
      recommendations = [
        'Set expectations for same-day responses',
        'Send important notifications with longer lead times'
      ]
    } else {
      description = `Very slow response times (${(avgHours/24).toFixed(1)} days average)`
      recommendations = [
        'Plan for multi-day response cycles',
        'Consider alternative communication methods for urgent matters',
        'Investigate potential engagement issues'
      ]
      confidence = 0.6
    }

    return {
      confidence,
      description,
      parameters: {
        average_hours: avgHours,
        median_hours: medianHours,
        std_dev_hours: stats.stdDev / (1000 * 60 * 60),
        sample_size: responseTimes.length
      },
      recommendations
    }
  }

  /**
   * Analyze engagement score trends over time
   */
  analyzeEngagementTrends(behaviorData: readonly UserBehaviorData[]): StatisticalResult {
    const engagementData = behaviorData
      .filter(data => data.engagement_score !== null && data.engagement_score !== undefined)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (engagementData.length < 10) {
      return {
        confidence: 0,
        description: 'Insufficient engagement data for trend analysis',
        parameters: {},
        recommendations: []
      }
    }

    // Calculate linear regression to detect trend
    const n = engagementData.length
    const x = engagementData.map((_, index) => index) // Time as index
    const y = engagementData.map(data => data.engagement_score)

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate correlation coefficient (R)
    const meanX = sumX / n
    const meanY = sumY / n
    const numerator = x.reduce((sum, val, index) => sum + (val - meanX) * (y[index] - meanY), 0)
    const denomX = Math.sqrt(x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0))
    const denomY = Math.sqrt(y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0))
    const correlation = numerator / (denomX * denomY)

    const confidence = Math.abs(correlation) // Higher absolute correlation = higher confidence

    let description = ''
    let recommendations: string[] = []

    if (slope > 0.01) {
      description = `Engagement is increasing over time (trend: +${(slope * 100).toFixed(2)}% per period)`
      recommendations = [
        'Current notification strategy is working well',
        'Consider scaling up engagement activities',
        'Maintain current timing and content patterns'
      ]
    } else if (slope < -0.01) {
      description = `Engagement is decreasing over time (trend: ${(slope * 100).toFixed(2)}% per period)`
      recommendations = [
        'Review and optimize notification strategy',
        'Consider changing content types or timing',
        'Investigate potential causes of engagement decline',
        'Survey users for feedback on notification preferences'
      ]
    } else {
      description = 'Engagement levels are stable over time'
      recommendations = [
        'Current engagement levels are consistent',
        'Monitor for any changes in user behavior',
        'Experiment with small improvements'
      ]
    }

    return {
      confidence: Math.max(confidence, 0.3), // Minimum confidence for trend analysis
      description,
      parameters: {
        slope,
        correlation,
        average_engagement: meanY,
        sample_size: n,
        trend_direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable'
      },
      recommendations
    }
  }

  /**
   * Analyze content engagement patterns
   */
  analyzeContentEngagement(behaviorData: readonly UserBehaviorData[]): StatisticalResult {
    // Group by action type (which indicates content type)
    const contentGroups: Record<string, number[]> = {}
    
    behaviorData.forEach(data => {
      if (data.engagement_score !== null && data.engagement_score !== undefined) {
        if (!contentGroups[data.action_type]) {
          contentGroups[data.action_type] = []
        }
        contentGroups[data.action_type]?.push(data.engagement_score)
      }
    })

    if (Object.keys(contentGroups).length < 2) {
      return {
        confidence: 0,
        description: 'Insufficient content variety for engagement analysis',
        parameters: {},
        recommendations: []
      }
    }

    // Calculate average engagement for each content type
    const contentEngagement: Record<string, number> = {}
    Object.keys(contentGroups).forEach(contentType => {
      const scores = contentGroups[contentType]
      if (scores && scores.length > 0) {
        contentEngagement[contentType] = scores.reduce((sum, score) => sum + score, 0) / scores.length
      }
    })

    // Sort content types by engagement
    const sortedContent = Object.entries(contentEngagement)
      .sort(([, a], [, b]) => b - a)

    const bestContent = sortedContent[0]
    const worstContent = sortedContent[sortedContent.length - 1]
    const engagementRange = (bestContent?.[1] ?? 0) - (worstContent?.[1] ?? 0)
    const avgEngagement = Object.values(contentEngagement).reduce((sum, val) => sum + val, 0) / Object.keys(contentEngagement).length

    const confidence = avgEngagement > 0 ? Math.min(engagementRange / avgEngagement, 1) : 0

    let description = bestContent ? `Best performing content: ${bestContent[0]} (${(bestContent[1] * 100).toFixed(1)}% engagement)` : 'No engagement data available'
    if (sortedContent.length > 1 && worstContent) {
      description += `, Worst: ${worstContent[0]} (${(worstContent[1] * 100).toFixed(1)}% engagement)`
    }

    const recommendations: string[] = []
    if (bestContent) {
      recommendations.push(`Prioritize ${bestContent[0]} type content for better engagement`)
    }
    if (worstContent && sortedContent.length > 1) {
      recommendations.push(`Consider reducing or improving ${worstContent[0]} type content`)
    }

    if (sortedContent.length > 2) {
      const topHalf = sortedContent.slice(0, Math.ceil(sortedContent.length / 2))
      recommendations.push(`High-engagement content types: ${topHalf.map(([type]) => type).join(', ')}`)
    }

    return {
      confidence: Math.max(confidence, 0.4),
      description,
      parameters: {
        content_rankings: Object.fromEntries(sortedContent),
        engagement_range: engagementRange,
        sample_sizes: Object.fromEntries(
          Object.entries(contentGroups).map(([type, scores]) => [type, scores.length])
        )
      },
      recommendations
    }
  }

  /**
   * Analyze optimal notification frequency
   */
  analyzeOptimalFrequency(behaviorData: readonly UserBehaviorData[]): StatisticalResult {
    // Group notifications by day to analyze frequency
    const dailyCounts: Record<string, number> = {}
    const dailyEngagement: Record<string, number[]> = {}

    behaviorData.forEach(data => {
      const day = new Date(data.timestamp).toISOString().split('T')[0]
      
      if (day) {
        if (!dailyCounts[day]) {
          dailyCounts[day] = 0
          dailyEngagement[day] = []
        }
        
        dailyCounts[day]++
        if (data.engagement_score !== null) {
          dailyEngagement[day].push(data.engagement_score)
        }
      }
    })

    if (Object.keys(dailyCounts).length < 7) {
      return {
        confidence: 0,
        description: 'Insufficient data for frequency analysis (need at least 7 days)',
        parameters: {},
        recommendations: []
      }
    }

    // Calculate average engagement for different frequency levels
    const frequencyEngagement: Record<string, number[]> = {
      low: [],      // 1-2 notifications per day
      medium: [],   // 3-5 notifications per day  
      high: []      // 6+ notifications per day
    }

    Object.keys(dailyCounts).forEach(day => {
      const count = dailyCounts[day]
      const avgEngagement = dailyEngagement[day].length > 0 
        ? dailyEngagement[day].reduce((sum, score) => sum + score, 0) / dailyEngagement[day].length
        : 0

      if (count <= 2) {
        frequencyEngagement.low.push(avgEngagement)
      } else if (count <= 5) {
        frequencyEngagement.medium.push(avgEngagement)
      } else {
        frequencyEngagement.high.push(avgEngagement)
      }
    })

    // Calculate average engagement for each frequency level
    const averages = {
      low: frequencyEngagement.low.length > 0 
        ? frequencyEngagement.low.reduce((sum, val) => sum + val, 0) / frequencyEngagement.low.length 
        : 0,
      medium: frequencyEngagement.medium.length > 0 
        ? frequencyEngagement.medium.reduce((sum, val) => sum + val, 0) / frequencyEngagement.medium.length 
        : 0,
      high: frequencyEngagement.high.length > 0 
        ? frequencyEngagement.high.reduce((sum, val) => sum + val, 0) / frequencyEngagement.high.length 
        : 0
    }

    // Find optimal frequency
    const sortedFreqs = Object.entries(averages)
      .filter(([, avg]) => avg > 0)
      .sort(([, a], [, b]) => b - a)

    if (sortedFreqs.length === 0) {
      return {
        confidence: 0,
        description: 'Unable to determine optimal frequency due to lack of engagement data',
        parameters: {},
        recommendations: []
      }
    }

    const optimalFreq = sortedFreqs[0][0]
    const optimalEngagement = sortedFreqs[0][1]
    
    // Calculate confidence based on difference between best and worst
    const engagementValues = sortedFreqs.map(([, avg]) => avg)
    const maxDiff = Math.max(...engagementValues) - Math.min(...engagementValues)
    const confidence = maxDiff / Math.max(...engagementValues)

    const frequencyLabels = {
      low: '1-2 notifications per day',
      medium: '3-5 notifications per day',
      high: '6+ notifications per day'
    }

    const description = `Optimal frequency: ${frequencyLabels[optimalFreq as keyof typeof frequencyLabels]} (${(optimalEngagement * 100).toFixed(1)}% engagement)`

    const recommendations: string[] = [
      `Target ${frequencyLabels[optimalFreq as keyof typeof frequencyLabels]} for best engagement`,
      'Monitor engagement when adjusting notification frequency'
    ]

    if (optimalFreq === 'high') {
      recommendations.push('High frequency works well, but monitor for notification fatigue')
    } else if (optimalFreq === 'low') {
      recommendations.push('Users prefer fewer, more targeted notifications')
    }

    return {
      confidence: Math.max(confidence, 0.5),
      description,
      parameters: {
        frequency_averages: averages,
        optimal_frequency: optimalFreq,
        sample_sizes: {
          low: frequencyEngagement.low.length,
          medium: frequencyEngagement.medium.length,
          high: frequencyEngagement.high.length
        }
      },
      recommendations
    }
  }

  /**
   * Find user's preferred notification times
   */
  findUserPreferredTimes(behaviorData: readonly UserBehaviorData[]): readonly number[] {
    const hourlyActivity = this.groupByTimeOfDay(behaviorData)
    const hours = Object.keys(hourlyActivity).map(h => parseInt(h))
    
    if (hours.length === 0) return []

    const engagementScores = hours.map(hour => 
      hourlyActivity[hour.toString().padStart(2, '0')].totalEngagement
    )
    
    const stats = this.calculateDescriptiveStats(engagementScores)
    const threshold = stats.mean + (stats.stdDev * 0.3)
    
    return hours.filter(hour => 
      hourlyActivity[hour.toString().padStart(2, '0')].totalEngagement > threshold
    ).sort((a, b) => a - b)
  }

  /**
   * Analyze user's response patterns
   */
  analyzeUserResponsePatterns(behaviorData: readonly UserBehaviorData[]): {
    averageResponseTime: number
    peakEngagementDays: string[]
    preferredNotificationTypes: string[]
  } {
    const responseTimes = behaviorData
      .filter(data => data.response_time_ms && data.response_time_ms > 0)
      .map(data => data.response_time_ms)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    // Analyze daily patterns
    const dailyData = this.groupByDayOfWeek(behaviorData)
    const dayNames = Object.keys(dailyData)
    const peakEngagementDays = dayNames
      .sort((a, b) => (dailyData[b]?.totalEngagement ?? 0) - (dailyData[a]?.totalEngagement ?? 0))
      .slice(0, 3) // Top 3 days

    // Analyze notification type preferences
    const typeEngagement: Record<string, number[]> = {}
    behaviorData.forEach(data => {
      if (data.engagement_score !== null && data.engagement_score !== undefined) {
        if (!typeEngagement[data.action_type]) {
          typeEngagement[data.action_type] = []
        }
        typeEngagement[data.action_type]?.push(data.engagement_score)
      }
    })

    const preferredNotificationTypes = Object.keys(typeEngagement)
      .map(type => {
        const scores = typeEngagement[type] ?? []
        return {
          type,
          avgEngagement: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
        }
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3) // Top 3 types
      .map(item => item.type)

    return {
      averageResponseTime,
      peakEngagementDays,
      preferredNotificationTypes
    }
  }

  /**
   * Compare organization metrics against industry benchmarks
   */
  compareAgainstBenchmarks(
    orgMetrics: Record<string, number>,
    benchmarks: readonly { 
      metric: string; 
      value: number; 
      category: string;
      metric_type: string;
      percentile_data: {
        p10: number;
        p25: number;
        p50: number;
        p75: number;
        p90: number;
      };
    }[]
  ): {
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
  } {
    const comparisonResults = []
    let totalPercentile = 0
    let metricCount = 0

    for (const benchmark of benchmarks) {
      const orgValue = orgMetrics[benchmark.metric_type]
      if (orgValue === undefined) continue

      const percentileData = benchmark.percentile_data
      let percentile = 0

      // Determine which percentile the organization falls into
      if (orgValue <= percentileData.p10) {
        percentile = 10
      } else if (orgValue <= percentileData.p25) {
        percentile = 25
      } else if (orgValue <= percentileData.p50) {
        percentile = 50
      } else if (orgValue <= percentileData.p75) {
        percentile = 75
      } else if (orgValue <= percentileData.p90) {
        percentile = 90
      } else {
        percentile = 95
      }

      let comparison: 'above_average' | 'average' | 'below_average'
      let recommendations: string[]

      if (percentile >= 75) {
        comparison = 'above_average'
        recommendations = [`Strong performance in ${benchmark.metric_type}`, 'Maintain current practices']
      } else if (percentile >= 25) {
        comparison = 'average'
        recommendations = [`Average performance in ${benchmark.metric_type}`, 'Consider optimization opportunities']
      } else {
        comparison = 'below_average'
        recommendations = [`Below average in ${benchmark.metric_type}`, 'Priority area for improvement']
      }

      comparisonResults.push({
        metricType: benchmark.metric_type,
        organizationValue: orgValue,
        industryPercentile: percentile,
        comparison,
        recommendations
      })

      totalPercentile += percentile
      metricCount++
    }

    const overallScore = metricCount > 0 ? totalPercentile / metricCount : 50

    const riskAreas = comparisonResults
      .filter(result => result.comparison === 'below_average')
      .map(result => result.metricType)

    const strengths = comparisonResults
      .filter(result => result.comparison === 'above_average')
      .map(result => result.metricType)

    return {
      metrics: comparisonResults,
      overallScore,
      riskAreas,
      strengths
    }
  }
}