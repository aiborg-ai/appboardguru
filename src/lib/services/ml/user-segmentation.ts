/**
 * User Segmentation Module
 * Implements ML algorithms to segment users based on behavior patterns
 */

import { StatisticalAnalysis } from './statistical-analysis'

export type UserSegment = 'highly_engaged' | 'moderate' | 'low_engagement' | 'sporadic'

export interface UserSegmentProfile {
  segment: UserSegment
  characteristics: string[]
  score: number
  confidence: number
  recommendations: string[]
}

export interface ClusterCenter {
  engagement: number
  frequency: number
  responseTime: number
  consistency: number
}

export interface SegmentationFeatures {
  avgEngagement: number
  activityFrequency: number
  avgResponseTime: number
  consistencyScore: number
  diversityScore: number
  peakHourSpread: number
}

export class UserSegmentation {
  private statisticalAnalysis: StatisticalAnalysis

  constructor() {
    this.statisticalAnalysis = new StatisticalAnalysis()
  }

  /**
   * Segment user based on behavior data
   */
  segmentUser(behaviorData: any[]): UserSegment {
    if (behaviorData.length === 0) {
      return 'low_engagement'
    }

    const features = this.extractUserFeatures(behaviorData)
    const segment = this.classifyUserSegment(features)
    
    return segment
  }

  /**
   * Get detailed user segment profile
   */
  getUserSegmentProfile(behaviorData: any[]): UserSegmentProfile {
    if (behaviorData.length === 0) {
      return {
        segment: 'low_engagement',
        characteristics: ['Insufficient data for segmentation'],
        score: 0,
        confidence: 0,
        recommendations: ['Encourage user to increase platform activity']
      }
    }

    const features = this.extractUserFeatures(behaviorData)
    const segment = this.classifyUserSegment(features)
    const characteristics = this.generateSegmentCharacteristics(features, segment)
    const score = this.calculateSegmentScore(features, segment)
    const confidence = this.calculateSegmentConfidence(features, behaviorData.length)
    const recommendations = this.generateSegmentRecommendations(segment, features)

    return {
      segment,
      characteristics,
      score,
      confidence,
      recommendations
    }
  }

  /**
   * Perform K-means clustering on multiple users
   */
  performUserClustering(
    userBehaviorData: Record<string, any[]>,
    k: number = 4
  ): {
    clusters: Record<string, string[]> // cluster -> user IDs
    centers: Record<string, ClusterCenter>
    silhouetteScore: number
  } {
    const users = Object.keys(userBehaviorData)
    
    if (users.length < k) {
      // Not enough users for clustering
      return {
        clusters: { 'single_cluster': users },
        centers: { 'single_cluster': { engagement: 0.5, frequency: 0.5, responseTime: 0.5, consistency: 0.5 } },
        silhouetteScore: 0
      }
    }

    // Extract features for all users
    const userFeatures = users.map(userId => {
      const features = this.extractUserFeatures(userBehaviorData[userId])
      return {
        userId,
        features: this.normalizeFeatures(features)
      }
    })

    // Initialize cluster centers randomly
    let centers = this.initializeClusterCenters(k)
    let clusters: Record<string, string[]> = {}
    let previousClusters: Record<string, string[]> = {}
    let iterations = 0
    const maxIterations = 100

    do {
      previousClusters = { ...clusters }
      clusters = {}

      // Assign users to clusters
      for (const user of userFeatures) {
        const closestCluster = this.findClosestCluster(user.features, centers)
        if (!clusters[closestCluster]) {
          clusters[closestCluster] = []
        }
        clusters[closestCluster].push(user.userId)
      }

      // Update cluster centers
      centers = this.updateClusterCenters(clusters, userFeatures)
      iterations++

    } while (!this.clustersConverged(clusters, previousClusters) && iterations < maxIterations)

    // Calculate silhouette score for clustering quality
    const silhouetteScore = this.calculateSilhouetteScore(userFeatures, clusters, centers)

    return { clusters, centers, silhouetteScore }
  }

  /**
   * Extract behavioral features from user data
   */
  private extractUserFeatures(behaviorData: any[]): SegmentationFeatures {
    if (behaviorData.length === 0) {
      return {
        avgEngagement: 0,
        activityFrequency: 0,
        avgResponseTime: 0,
        consistencyScore: 0,
        diversityScore: 0,
        peakHourSpread: 0
      }
    }

    // Calculate average engagement
    const engagementScores = behaviorData
      .filter(d => d.engagement_score !== null && d.engagement_score !== undefined)
      .map(d => d.engagement_score)
    const avgEngagement = engagementScores.length > 0 
      ? engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length 
      : 0

    // Calculate activity frequency (actions per day)
    const daySpan = this.calculateDaySpan(behaviorData)
    const activityFrequency = daySpan > 0 ? behaviorData.length / daySpan : 0

    // Calculate average response time
    const responseTimes = behaviorData
      .filter(d => d.response_time_ms && d.response_time_ms > 0)
      .map(d => d.response_time_ms)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    // Calculate consistency score (how regular is the user's activity)
    const consistencyScore = this.calculateConsistencyScore(behaviorData)

    // Calculate diversity score (how many different actions the user performs)
    const diversityScore = this.calculateDiversityScore(behaviorData)

    // Calculate peak hour spread (how concentrated activity is)
    const peakHourSpread = this.calculatePeakHourSpread(behaviorData)

    return {
      avgEngagement,
      activityFrequency,
      avgResponseTime,
      consistencyScore,
      diversityScore,
      peakHourSpread
    }
  }

  /**
   * Classify user segment based on features
   */
  private classifyUserSegment(features: SegmentationFeatures): UserSegment {
    const {
      avgEngagement,
      activityFrequency,
      avgResponseTime,
      consistencyScore,
      diversityScore
    } = features

    // Convert response time to score (lower is better)
    const responseTimeScore = avgResponseTime > 0 ? Math.max(0, 1 - (avgResponseTime / (24 * 60 * 60 * 1000))) : 0.5

    // Create composite scores
    const engagementWeight = 0.3
    const frequencyWeight = 0.25
    const responseWeight = 0.2
    const consistencyWeight = 0.15
    const diversityWeight = 0.1

    const compositeScore = 
      avgEngagement * engagementWeight +
      Math.min(activityFrequency / 10, 1) * frequencyWeight + // Cap frequency at 10 actions/day
      responseTimeScore * responseWeight +
      consistencyScore * consistencyWeight +
      diversityScore * diversityWeight

    // Classification thresholds
    if (compositeScore >= 0.75) {
      return 'highly_engaged'
    } else if (compositeScore >= 0.5) {
      return 'moderate'
    } else if (compositeScore >= 0.25 && consistencyScore > 0.3) {
      return 'low_engagement'
    } else {
      return 'sporadic'
    }
  }

  /**
   * Generate characteristics description for segment
   */
  private generateSegmentCharacteristics(features: SegmentationFeatures, segment: UserSegment): string[] {
    const characteristics: string[] = []

    // Engagement characteristics
    if (features.avgEngagement > 0.8) {
      characteristics.push('Very high engagement with notifications')
    } else if (features.avgEngagement > 0.6) {
      characteristics.push('Good engagement with notifications')
    } else if (features.avgEngagement > 0.3) {
      characteristics.push('Moderate engagement with notifications')
    } else {
      characteristics.push('Low engagement with notifications')
    }

    // Frequency characteristics
    if (features.activityFrequency > 8) {
      characteristics.push('Very active user (daily usage)')
    } else if (features.activityFrequency > 3) {
      characteristics.push('Regular user (frequent usage)')
    } else if (features.activityFrequency > 1) {
      characteristics.push('Occasional user (weekly usage)')
    } else {
      characteristics.push('Infrequent user (monthly usage)')
    }

    // Response time characteristics
    const avgHours = features.avgResponseTime / (1000 * 60 * 60)
    if (avgHours < 2) {
      characteristics.push('Very quick to respond (under 2 hours)')
    } else if (avgHours < 8) {
      characteristics.push('Quick to respond (same day)')
    } else if (avgHours < 48) {
      characteristics.push('Moderate response time (1-2 days)')
    } else {
      characteristics.push('Slow to respond (multi-day delays)')
    }

    // Consistency characteristics
    if (features.consistencyScore > 0.7) {
      characteristics.push('Highly consistent activity patterns')
    } else if (features.consistencyScore > 0.4) {
      characteristics.push('Somewhat predictable activity patterns')
    } else {
      characteristics.push('Irregular activity patterns')
    }

    // Diversity characteristics
    if (features.diversityScore > 0.7) {
      characteristics.push('Engages with many different features')
    } else if (features.diversityScore > 0.4) {
      characteristics.push('Uses several different features')
    } else {
      characteristics.push('Limited feature usage')
    }

    return characteristics
  }

  /**
   * Calculate segment score (0-1 scale)
   */
  private calculateSegmentScore(features: SegmentationFeatures, segment: UserSegment): number {
    const segmentScores = {
      highly_engaged: 0.9,
      moderate: 0.65,
      low_engagement: 0.4,
      sporadic: 0.2
    }

    // Adjust based on features
    let baseScore = segmentScores[segment]
    
    // Boost for high consistency
    if (features.consistencyScore > 0.7) {
      baseScore += 0.05
    }

    // Boost for high diversity
    if (features.diversityScore > 0.7) {
      baseScore += 0.05
    }

    return Math.min(1, baseScore)
  }

  /**
   * Calculate confidence in segmentation
   */
  private calculateSegmentConfidence(features: SegmentationFeatures, dataPoints: number): number {
    // Base confidence on amount of data
    let confidence = Math.min(dataPoints / 50, 1) * 0.6 // Max 0.6 from data quantity

    // Increase confidence for clear patterns
    if (features.consistencyScore > 0.6) {
      confidence += 0.2
    }

    // Increase confidence for sufficient diversity
    if (features.diversityScore > 0.3) {
      confidence += 0.1
    }

    // Increase confidence for clear engagement levels
    if (features.avgEngagement > 0.8 || features.avgEngagement < 0.2) {
      confidence += 0.1
    }

    return Math.min(1, confidence)
  }

  /**
   * Generate recommendations for segment
   */
  private generateSegmentRecommendations(segment: UserSegment, features: SegmentationFeatures): string[] {
    const recommendations: string[] = []

    switch (segment) {
      case 'highly_engaged':
        recommendations.push('Maintain current engagement with consistent, valuable content')
        recommendations.push('Consider this user for beta testing new features')
        recommendations.push('Use as a case study for best practices')
        if (features.diversityScore < 0.7) {
          recommendations.push('Introduce to additional platform features')
        }
        break

      case 'moderate':
        recommendations.push('Look for opportunities to increase engagement')
        recommendations.push('Personalize content based on peak activity times')
        if (features.avgResponseTime > 8 * 60 * 60 * 1000) { // > 8 hours
          recommendations.push('Optimize notification timing for faster response')
        }
        recommendations.push('Gradually introduce new features to increase diversity')
        break

      case 'low_engagement':
        recommendations.push('Focus on re-engagement strategies')
        recommendations.push('Reduce notification frequency to avoid fatigue')
        recommendations.push('Send only high-priority, highly relevant notifications')
        recommendations.push('Consider onboarding refresher or tutorial content')
        if (features.consistencyScore > 0.4) {
          recommendations.push('User shows consistent patterns - leverage predictable times')
        }
        break

      case 'sporadic':
        recommendations.push('Implement gentle re-engagement campaign')
        recommendations.push('Send periodic value-reminder notifications')
        recommendations.push('Focus on single, simple call-to-action items')
        recommendations.push('Consider email outreach as supplement to in-app notifications')
        recommendations.push('Investigate barriers to consistent usage')
        break
    }

    // Add feature-specific recommendations
    if (features.peakHourSpread > 12) {
      recommendations.push('Activity is spread throughout day - flexible timing approach')
    } else if (features.peakHourSpread < 6) {
      recommendations.push('Activity concentrated in specific hours - target those times')
    }

    return recommendations
  }

  // Helper methods for clustering

  private normalizeFeatures(features: SegmentationFeatures): number[] {
    return [
      features.avgEngagement, // Already 0-1
      Math.min(features.activityFrequency / 10, 1), // Normalize to 0-1
      Math.max(0, 1 - (features.avgResponseTime / (7 * 24 * 60 * 60 * 1000))), // Week max
      features.consistencyScore, // Already 0-1
      features.diversityScore, // Already 0-1
      features.peakHourSpread / 24 // Normalize to 0-1
    ]
  }

  private initializeClusterCenters(k: number): Record<string, ClusterCenter> {
    const centers: Record<string, ClusterCenter> = {}
    
    for (let i = 0; i < k; i++) {
      centers[`cluster_${i}`] = {
        engagement: Math.random(),
        frequency: Math.random(),
        responseTime: Math.random(),
        consistency: Math.random()
      }
    }

    return centers
  }

  private findClosestCluster(userFeatures: number[], centers: Record<string, ClusterCenter>): string {
    let closestCluster = Object.keys(centers)[0]
    let minDistance = this.euclideanDistanceToCenter(userFeatures, centers[closestCluster])

    for (const [clusterId, center] of Object.entries(centers)) {
      const distance = this.euclideanDistanceToCenter(userFeatures, center)
      if (distance < minDistance) {
        minDistance = distance
        closestCluster = clusterId
      }
    }

    return closestCluster
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    )
  }

  private euclideanDistanceToCenter(userFeatures: number[], center: ClusterCenter): number {
    const centerArray = [center.engagement, center.frequency, center.responseTime, center.consistency]
    return this.euclideanDistance(userFeatures.slice(0, 4), centerArray)
  }

  private updateClusterCenters(
    clusters: Record<string, string[]>,
    userFeatures: Array<{ userId: string; features: number[] }>
  ): Record<string, ClusterCenter> {
    const newCenters: Record<string, ClusterCenter> = {}

    for (const [clusterId, userIds] of Object.entries(clusters)) {
      if (userIds.length === 0) continue

      const clusterFeatures = userIds.map(userId => 
        userFeatures.find(u => u.userId === userId)!.features
      )

      // Calculate mean of each feature (first 4 features for ClusterCenter)
      const sums = { engagement: 0, frequency: 0, responseTime: 0, consistency: 0 }

      for (const features of clusterFeatures) {
        sums.engagement += features[0] || 0
        sums.frequency += features[1] || 0
        sums.responseTime += features[2] || 0
        sums.consistency += features[3] || 0
      }

      const count = clusterFeatures.length
      newCenters[clusterId] = {
        engagement: sums.engagement / count,
        frequency: sums.frequency / count,
        responseTime: sums.responseTime / count,
        consistency: sums.consistency / count
      }
    }

    return newCenters
  }

  private clustersConverged(
    current: Record<string, string[]>,
    previous: Record<string, string[]>
  ): boolean {
    const currentKeys = Object.keys(current).sort()
    const previousKeys = Object.keys(previous).sort()

    if (currentKeys.length !== previousKeys.length) return false

    for (const key of currentKeys) {
      const currentUsers = new Set(current[key] || [])
      const previousUsers = new Set(previous[key] || [])

      if (currentUsers.size !== previousUsers.size) return false

      for (const user of currentUsers) {
        if (!previousUsers.has(user)) return false
      }
    }

    return true
  }

  private calculateSilhouetteScore(
    userFeatures: Array<{ userId: string; features: number[] }>,
    clusters: Record<string, string[]>,
    centers: Record<string, ClusterCenter>
  ): number {
    // Simplified silhouette calculation
    let totalScore = 0
    let totalUsers = 0

    for (const [clusterId, userIds] of Object.entries(clusters)) {
      if (userIds.length <= 1) continue

      for (const userId of userIds) {
        const userFeature = userFeatures.find(u => u.userId === userId)!
        
        // Calculate intra-cluster distance
        const intraDistance = this.euclideanDistanceToCenter(userFeature.features, centers[clusterId])
        
        // Calculate inter-cluster distance (to nearest other cluster)
        let minInterDistance = Infinity
        for (const [otherClusterId, otherCenter] of Object.entries(centers)) {
          if (otherClusterId !== clusterId) {
            const interDistance = this.euclideanDistanceToCenter(userFeature.features, otherCenter)
            minInterDistance = Math.min(minInterDistance, interDistance)
          }
        }

        if (minInterDistance !== Infinity) {
          const silhouette = (minInterDistance - intraDistance) / Math.max(minInterDistance, intraDistance)
          totalScore += silhouette
          totalUsers++
        }
      }
    }

    return totalUsers > 0 ? totalScore / totalUsers : 0
  }

  // Feature calculation helpers

  private calculateDaySpan(behaviorData: any[]): number {
    if (behaviorData.length === 0) return 0

    const timestamps = behaviorData.map(d => new Date(d.timestamp).getTime())
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)

    return (maxTime - minTime) / (1000 * 60 * 60 * 24)
  }

  private calculateConsistencyScore(behaviorData: any[]): number {
    if (behaviorData.length < 7) return 0 // Need at least a week of data

    // Group by day of week and calculate variance
    const dayOfWeekCounts = Array(7).fill(0)
    behaviorData.forEach(item => {
      const dayOfWeek = new Date(item.timestamp).getDay()
      dayOfWeekCounts[dayOfWeek]++
    })

    const stats = this.statisticalAnalysis.calculateDescriptiveStats(dayOfWeekCounts)
    const coefficientOfVariation = stats.mean > 0 ? stats.stdDev / stats.mean : 1

    // Lower coefficient of variation = higher consistency
    return Math.max(0, 1 - coefficientOfVariation)
  }

  private calculateDiversityScore(behaviorData: any[]): number {
    const actionTypes = new Set(behaviorData.map(d => d.action_type))
    const maxExpectedTypes = 10 // Assume max 10 different action types

    return Math.min(actionTypes.size / maxExpectedTypes, 1)
  }

  private calculatePeakHourSpread(behaviorData: any[]): number {
    if (behaviorData.length === 0) return 0

    const hourCounts = Array(24).fill(0)
    behaviorData.forEach(item => {
      const hour = new Date(item.timestamp).getHours()
      hourCounts[hour]++
    })

    // Find hours with activity above average
    const avgCount = hourCounts.reduce((sum, count) => sum + count, 0) / 24
    const activeHours = hourCounts.filter(count => count > avgCount).length

    return activeHours
  }
}