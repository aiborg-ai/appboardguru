/**
 * AI-Powered Activity Insights Engine
 * Machine learning models for predictions, anomaly detection, and recommendations
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface MLPrediction {
  id: string
  type: 'churn_risk' | 'security_threat' | 'compliance_violation' | 'engagement_drop' | 'resource_demand'
  confidence: number
  prediction: any
  reasoning: string[]
  recommendedActions: string[]
  timeframe: string
  metadata: Record<string, any>
}

export interface AnomalyDetection {
  id: string
  anomalyType: 'statistical' | 'behavioral' | 'temporal' | 'geospatial' | 'contextual'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedEntities: Array<{ type: string; id: string; name: string }>
  baseline: Record<string, number>
  detected: Record<string, number>
  deviation: number
  confidence: number
  investigationRequired: boolean
  metadata: Record<string, any>
}

export interface ActivityRecommendation {
  id: string
  type: 'engagement' | 'security' | 'efficiency' | 'compliance' | 'collaboration'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  expectedImpact: string
  effort: 'minimal' | 'moderate' | 'significant'
  targetUsers?: string[]
  implementationSteps: string[]
  metrics: Array<{ name: string; expectedChange: number; unit: string }>
}

export class MLInsightsEngine {
  /**
   * Generate comprehensive AI insights for an organization
   */
  static async generateOrganizationInsights(
    organizationId: string,
    options: {
      includePredictions?: boolean
      includeAnomalies?: boolean
      includeRecommendations?: boolean
      timeRange?: { start: string; end: string }
    } = {}
  ): Promise<{
    predictions: MLPrediction[]
    anomalies: AnomalyDetection[]
    recommendations: ActivityRecommendation[]
    summary: {
      overallHealthScore: number
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
      keyInsights: string[]
      urgentActions: string[]
    }
  }> {
    const {
      includePredictions = true,
      includeAnomalies = true,
      includeRecommendations = true,
      timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    } = options

    try {
      // Run parallel analysis
      const [predictions, anomalies, recommendations] = await Promise.all([
        includePredictions ? this.generatePredictions(organizationId, timeRange) : [],
        includeAnomalies ? this.detectAnomalies(organizationId, timeRange) : [],
        includeRecommendations ? this.generateRecommendations(organizationId, timeRange) : []
      ])

      // Calculate overall health score
      const healthScore = await this.calculateOrganizationHealthScore(
        organizationId,
        predictions,
        anomalies,
        timeRange
      )

      // Generate summary insights
      const summary = this.generateInsightsSummary(predictions, anomalies, recommendations, healthScore)

      return {
        predictions,
        anomalies,
        recommendations,
        summary
      }
    } catch (error) {
      console.error('Error generating organization insights:', error)
      throw error
    }
  }

  /**
   * Predict user behavior and risks
   */
  private static async generatePredictions(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<MLPrediction[]> {
    const predictions: MLPrediction[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Get user activity patterns
      const { data: userData } = await supabase
        .from('daily_activity_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('activity_date', timeRange.start)
        .order('activity_date', { ascending: false })

      if (!userData?.length) return predictions

      // Analyze each user for churn risk
      const userGroups = userData.reduce((acc, record) => {
        if (!acc[record.user_id]) {
          acc[record.user_id] = []
        }
        acc[record.user_id].push(record)
        return acc
      }, {} as Record<string, any[]>)

      for (const [userId, userActivities] of Object.entries(userGroups)) {
        // Churn prediction model (simplified)
        const churnRisk = await this.predictChurnRisk(userId, userActivities as any[])
        if (churnRisk.confidence > 0.6) {
          predictions.push(churnRisk)
        }

        // Security threat prediction
        const securityThreat = await this.predictSecurityThreats(userId, userActivities as any[])
        if (securityThreat.confidence > 0.7) {
          predictions.push(securityThreat)
        }
      }

      // Organizational-level predictions
      const resourceDemand = await this.predictResourceDemand(organizationId, userData)
      if (resourceDemand.confidence > 0.5) {
        predictions.push(resourceDemand)
      }

      return predictions
    } catch (error) {
      console.error('Error generating predictions:', error)
      return []
    }
  }

  /**
   * Advanced anomaly detection using multiple algorithms
   */
  private static async detectAnomalies(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      // Statistical anomalies (Z-score based)
      const statisticalAnomalies = await this.detectStatisticalAnomalies(organizationId, timeRange)
      anomalies.push(...statisticalAnomalies)

      // Behavioral anomalies (pattern deviation)
      const behavioralAnomalies = await this.detectBehavioralAnomalies(organizationId, timeRange)
      anomalies.push(...behavioralAnomalies)

      // Temporal anomalies (time-based patterns)
      const temporalAnomalies = await this.detectTemporalAnomalies(organizationId, timeRange)
      anomalies.push(...temporalAnomalies)

      // Geospatial anomalies (location-based)
      const geospatialAnomalies = await this.detectGeospatialAnomalies(organizationId, timeRange)
      anomalies.push(...geospatialAnomalies)

      return anomalies.sort((a, b) => b.severity.localeCompare(a.severity))
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return []
    }
  }

  /**
   * Generate intelligent recommendations
   */
  private static async generateRecommendations(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<ActivityRecommendation[]> {
    const recommendations: ActivityRecommendation[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Analyze current state
      const orgMetrics = await this.getOrganizationMetrics(organizationId, timeRange)
      const userEngagement = await this.getUserEngagementMetrics(organizationId, timeRange)
      const securityMetrics = await this.getSecurityMetrics(organizationId, timeRange)

      // Engagement recommendations
      if (orgMetrics.averageEngagement < 30) {
        recommendations.push({
          id: `engagement-${Date.now()}`,
          type: 'engagement',
          priority: 'high',
          title: 'Improve User Engagement',
          description: 'User engagement is below recommended levels. Consider implementing gamification or training programs.',
          expectedImpact: 'Increase user engagement by 40-60%',
          effort: 'moderate',
          targetUsers: userEngagement.lowEngagementUsers,
          implementationSteps: [
            'Identify low-engagement users',
            'Create personalized onboarding flows',
            'Implement achievement badges',
            'Add interactive tutorials',
            'Schedule regular check-ins'
          ],
          metrics: [
            { name: 'Daily Active Users', expectedChange: 25, unit: '%' },
            { name: 'Session Duration', expectedChange: 35, unit: '%' },
            { name: 'Feature Adoption', expectedChange: 50, unit: '%' }
          ]
        })
      }

      // Security recommendations
      if (securityMetrics.riskScore > 60) {
        recommendations.push({
          id: `security-${Date.now()}`,
          type: 'security',
          priority: 'urgent',
          title: 'Enhance Security Monitoring',
          description: 'Multiple security concerns detected. Implement additional monitoring and controls.',
          expectedImpact: 'Reduce security incidents by 70-80%',
          effort: 'significant',
          implementationSteps: [
            'Enable multi-factor authentication',
            'Implement IP allowlisting',
            'Add device fingerprinting',
            'Create automated incident response',
            'Conduct security training'
          ],
          metrics: [
            { name: 'Security Score', expectedChange: 40, unit: 'points' },
            { name: 'Incident Response Time', expectedChange: -60, unit: '%' },
            { name: 'False Positives', expectedChange: -30, unit: '%' }
          ]
        })
      }

      // Efficiency recommendations
      const inefficiencies = await this.detectInefficiencies(organizationId, timeRange)
      if (inefficiencies.length > 0) {
        recommendations.push({
          id: `efficiency-${Date.now()}`,
          type: 'efficiency',
          priority: 'medium',
          title: 'Optimize Workflow Efficiency',
          description: 'Detected workflow bottlenecks and redundant processes that can be streamlined.',
          expectedImpact: 'Reduce task completion time by 25-40%',
          effort: 'moderate',
          implementationSteps: [
            'Automate repetitive tasks',
            'Implement smart notifications',
            'Create workflow templates',
            'Add bulk operation support',
            'Optimize navigation paths'
          ],
          metrics: [
            { name: 'Task Completion Time', expectedChange: -30, unit: '%' },
            { name: 'User Satisfaction', expectedChange: 25, unit: '%' },
            { name: 'Process Efficiency', expectedChange: 40, unit: '%' }
          ]
        })
      }

      // Compliance recommendations
      const complianceGaps = await this.detectComplianceGaps(organizationId, timeRange)
      if (complianceGaps.length > 0) {
        recommendations.push({
          id: `compliance-${Date.now()}`,
          type: 'compliance',
          priority: 'high',
          title: 'Address Compliance Gaps',
          description: 'Several compliance requirements are not being fully met. Immediate action required.',
          expectedImpact: 'Achieve 95%+ compliance score',
          effort: 'significant',
          implementationSteps: [
            'Implement automated compliance monitoring',
            'Create compliance dashboards',
            'Schedule regular compliance audits',
            'Add compliance training modules',
            'Establish incident response procedures'
          ],
          metrics: [
            { name: 'Compliance Score', expectedChange: 25, unit: 'points' },
            { name: 'Audit Preparation Time', expectedChange: -50, unit: '%' },
            { name: 'Regulatory Risk', expectedChange: -70, unit: '%' }
          ]
        })
      }

      return recommendations.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return []
    }
  }

  /**
   * Predict user churn risk
   */
  private static async predictChurnRisk(userId: string, userActivities: any[]): Promise<MLPrediction> {
    try {
      // Calculate activity trends
      const recentActivities = userActivities.slice(0, 7) // Last 7 days
      const previousActivities = userActivities.slice(7, 14) // Previous 7 days
      
      const recentAvg = recentActivities.reduce((sum, day) => sum + day.total_activities, 0) / 7
      const previousAvg = previousActivities.reduce((sum, day) => sum + day.total_activities, 0) / 7
      
      const activityTrend = previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0
      const daysSinceLastActivity = userActivities.length > 0 ? 
        (Date.now() - new Date(userActivities[0].activity_date).getTime()) / (1000 * 60 * 60 * 24) : 30

      // Simple ML model (in production, use TensorFlow.js or API)
      let churnScore = 0
      
      // Factors that increase churn risk
      if (daysSinceLastActivity > 7) churnScore += 0.3
      if (daysSinceLastActivity > 14) churnScore += 0.3
      if (activityTrend < -0.5) churnScore += 0.2
      if (recentAvg < 2) churnScore += 0.2
      
      const confidence = Math.min(0.95, Math.max(0.1, churnScore + 0.1))
      
      const reasoning = []
      if (daysSinceLastActivity > 7) reasoning.push(`${Math.round(daysSinceLastActivity)} days since last activity`)
      if (activityTrend < -0.5) reasoning.push(`${Math.round(activityTrend * 100)}% decrease in activity`)
      if (recentAvg < 2) reasoning.push(`Low activity level (${recentAvg.toFixed(1)} actions/day)`)

      return {
        id: `churn-${userId}-${Date.now()}`,
        type: 'churn_risk',
        confidence,
        prediction: {
          riskLevel: churnScore > 0.7 ? 'high' : churnScore > 0.4 ? 'medium' : 'low',
          churnProbability: churnScore,
          estimatedTimeToChurn: daysSinceLastActivity > 14 ? '1-2 weeks' : '1-2 months'
        },
        reasoning,
        recommendedActions: [
          'Send personalized re-engagement email',
          'Offer one-on-one training session',
          'Highlight unused features',
          'Check for technical barriers'
        ],
        timeframe: '30 days',
        metadata: {
          userId,
          daysSinceLastActivity,
          activityTrend,
          recentAverage: recentAvg
        }
      }
    } catch (error) {
      console.error('Error predicting churn risk:', error)
      throw error
    }
  }

  /**
   * Predict security threats
   */
  private static async predictSecurityThreats(userId: string, userActivities: any[]): Promise<MLPrediction> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get detailed security events for this user
      const { data: securityEvents } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .in('event_type', ['security_event', 'authentication'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      let threatScore = 0
      const riskFactors = []

      if (securityEvents) {
        // Failed login attempts
        const failedLogins = securityEvents.filter(e => 
          e.action.includes('login') && e.outcome === 'failure'
        ).length
        
        if (failedLogins > 5) {
          threatScore += 0.3
          riskFactors.push(`${failedLogins} failed login attempts`)
        }

        // Multiple IP addresses
        const uniqueIPs = new Set(securityEvents.map(e => e.ip_address).filter(Boolean))
        if (uniqueIPs.size > 3) {
          threatScore += 0.2
          riskFactors.push(`Activity from ${uniqueIPs.size} different IP addresses`)
        }

        // Unusual activity times
        const afterHoursActivity = securityEvents.filter(e => {
          const hour = new Date(e.created_at).getHours()
          return hour < 6 || hour > 22
        }).length

        if (afterHoursActivity > 5) {
          threatScore += 0.25
          riskFactors.push(`${afterHoursActivity} after-hours activities`)
        }
      }

      // Activity pattern analysis
      const recentActivity = userActivities.slice(0, 7)
      const avgRecentActivity = recentActivity.reduce((sum, day) => sum + day.total_activities, 0) / 7
      
      if (avgRecentActivity > 50) { // Unusually high activity
        threatScore += 0.15
        riskFactors.push('Unusually high activity volume')
      }

      const confidence = Math.min(0.95, threatScore + 0.1)

      return {
        id: `security-${userId}-${Date.now()}`,
        type: 'security_threat',
        confidence,
        prediction: {
          threatLevel: threatScore > 0.7 ? 'critical' : threatScore > 0.4 ? 'high' : 'medium',
          threatProbability: threatScore,
          mainConcerns: riskFactors
        },
        reasoning: riskFactors,
        recommendedActions: [
          'Require additional authentication',
          'Monitor user activity closely',
          'Review access permissions',
          'Contact user for verification'
        ],
        timeframe: 'immediate',
        metadata: {
          userId,
          threatScore,
          securityEventsCount: securityEvents?.length || 0
        }
      }
    } catch (error) {
      console.error('Error predicting security threats:', error)
      throw error
    }
  }

  /**
   * Detect statistical anomalies using Z-score analysis
   */
  private static async detectStatisticalAnomalies(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Get activity data for statistical analysis
      const { data: activityData } = await supabase
        .from('daily_activity_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('activity_date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // 60 days for baseline

      if (!activityData || activityData.length < 14) return anomalies

      // Calculate baseline statistics
      const baseline = {
        meanActivity: activityData.reduce((sum, day) => sum + day.total_activities, 0) / activityData.length,
        meanUsers: activityData.reduce((sum, day) => sum + (day.unique_ip_addresses || 1), 0) / activityData.length
      }

      // Calculate standard deviations
      const activityVariance = activityData.reduce((sum, day) => 
        sum + Math.pow(day.total_activities - baseline.meanActivity, 2), 0
      ) / activityData.length
      const activityStdDev = Math.sqrt(activityVariance)

      // Find recent anomalies (last 7 days)
      const recentData = activityData.filter(day => 
        new Date(day.activity_date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      )

      for (const day of recentData) {
        const zScore = Math.abs((day.total_activities - baseline.meanActivity) / activityStdDev)
        
        if (zScore > 2.5) { // Significant anomaly
          anomalies.push({
            id: `statistical-${day.activity_date}-${Date.now()}`,
            anomalyType: 'statistical',
            severity: zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium',
            description: `Unusual activity volume detected on ${day.activity_date}`,
            affectedEntities: [
              { type: 'organization', id: organizationId, name: 'Organization' },
              { type: 'date', id: day.activity_date, name: day.activity_date }
            ],
            baseline: {
              averageActivity: baseline.meanActivity,
              standardDeviation: activityStdDev
            },
            detected: {
              actualActivity: day.total_activities,
              zScore: zScore
            },
            deviation: zScore,
            confidence: Math.min(0.95, zScore / 4), // Higher Z-score = higher confidence
            investigationRequired: zScore > 3,
            metadata: {
              date: day.activity_date,
              expectedRange: {
                min: baseline.meanActivity - 2 * activityStdDev,
                max: baseline.meanActivity + 2 * activityStdDev
              }
            }
          })
        }
      }

      return anomalies
    } catch (error) {
      console.error('Error detecting statistical anomalies:', error)
      return []
    }
  }

  /**
   * Detect behavioral pattern anomalies
   */
  private static async detectBehavioralAnomalies(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Analyze user behavior patterns
      const { data: users } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (!users) return anomalies

      for (const user of users) {
        const { data: userBehavior } = await supabase.rpc('detect_activity_anomalies', {
          input_user_id: user.user_id,
          input_org_id: organizationId
        })

        if (userBehavior) {
          const behavior = userBehavior as any

          if (behavior.bulk_downloads && behavior.downloads_today > 10) {
            anomalies.push({
              id: `behavioral-bulk-${user.user_id}-${Date.now()}`,
              anomalyType: 'behavioral',
              severity: 'high',
              description: 'Unusual bulk download behavior detected',
              affectedEntities: [
                { type: 'user', id: user.user_id, name: 'User' }
              ],
              baseline: { normalDownloads: 2 },
              detected: { actualDownloads: behavior.downloads_today },
              deviation: behavior.downloads_today / 2,
              confidence: 0.88,
              investigationRequired: true,
              metadata: {
                userId: user.user_id,
                downloadsToday: behavior.downloads_today,
                pattern: 'bulk_download'
              }
            })
          }

          if (behavior.unusual_hours && behavior.unusual_hours_count > 5) {
            anomalies.push({
              id: `behavioral-hours-${user.user_id}-${Date.now()}`,
              anomalyType: 'behavioral',
              severity: 'medium',
              description: 'Unusual activity hours detected',
              affectedEntities: [
                { type: 'user', id: user.user_id, name: 'User' }
              ],
              baseline: { normalHours: 10 }, // 10 hours (8am-6pm)
              detected: { afterHoursCount: behavior.unusual_hours_count },
              deviation: behavior.unusual_hours_count,
              confidence: 0.75,
              investigationRequired: behavior.unusual_hours_count > 10,
              metadata: {
                userId: user.user_id,
                unusualHoursCount: behavior.unusual_hours_count,
                pattern: 'unusual_hours'
              }
            })
          }
        }
      }

      return anomalies
    } catch (error) {
      console.error('Error detecting behavioral anomalies:', error)
      return []
    }
  }

  /**
   * Detect temporal anomalies (time-based patterns)
   */
  private static async detectTemporalAnomalies(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Analyze hourly patterns
      const { data: hourlyData } = await supabase
        .from('audit_logs')
        .select('created_at, event_category')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      if (!hourlyData) return anomalies

      // Group by hour
      const hourlyActivity = hourlyData.reduce((acc, record) => {
        const hour = new Date(record.created_at).getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      // Expected patterns (business hours should have more activity)
      const expectedPattern = {
        0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
        6: 0.03, 7: 0.05, 8: 0.08, 9: 0.12, 10: 0.12, 11: 0.11,
        12: 0.08, 13: 0.10, 14: 0.12, 15: 0.11, 16: 0.10, 17: 0.08,
        18: 0.04, 19: 0.02, 20: 0.02, 21: 0.01, 22: 0.01, 23: 0.01
      }

      const totalActivity = Object.values(hourlyActivity).reduce((sum, count) => sum + count, 0)

      for (let hour = 0; hour < 24; hour++) {
        const actualPercentage = (hourlyActivity[hour] || 0) / totalActivity
        const expectedPercentage = expectedPattern[hour as keyof typeof expectedPattern]
        const deviation = Math.abs(actualPercentage - expectedPercentage) / expectedPercentage

        if (deviation > 2 && actualPercentage > 0.05) { // Significant deviation with meaningful activity
          anomalies.push({
            id: `temporal-hour-${hour}-${Date.now()}`,
            anomalyType: 'temporal',
            severity: deviation > 5 ? 'high' : 'medium',
            description: `Unusual activity pattern at ${hour}:00 - ${actualPercentage.toFixed(1)}% vs expected ${expectedPercentage.toFixed(1)}%`,
            affectedEntities: [
              { type: 'timeframe', id: `hour-${hour}`, name: `${hour}:00-${hour + 1}:00` }
            ],
            baseline: { expectedPercentage },
            detected: { actualPercentage },
            deviation,
            confidence: Math.min(0.9, deviation / 5),
            investigationRequired: deviation > 3,
            metadata: {
              hour,
              activityCount: hourlyActivity[hour] || 0,
              totalActivity
            }
          })
        }
      }

      return anomalies
    } catch (error) {
      console.error('Error detecting temporal anomalies:', error)
      return []
    }
  }

  /**
   * Detect geospatial anomalies
   */
  private static async detectGeospatialAnomalies(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    try {
      const supabase = await createSupabaseServerClient()

      // Get IP address patterns
      const { data: ipData } = await supabase
        .from('audit_logs')
        .select('user_id, ip_address, created_at, users(full_name)')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)
        .not('ip_address', 'is', null)

      if (!ipData) return anomalies

      // Group by user and analyze IP patterns
      const userIPPatterns = ipData.reduce((acc, record) => {
        if (!acc[record.user_id]) {
          acc[record.user_id] = {
            ips: new Set(),
            activities: []
          }
        }
        acc[record.user_id].ips.add(record.ip_address)
        acc[record.user_id].activities.push(record)
        return acc
      }, {} as Record<string, any>)

      for (const [userId, pattern] of Object.entries(userIPPatterns)) {
        // Multiple IP addresses in short time
        if (pattern.ips.size > 5) {
          anomalies.push({
            id: `geospatial-multi-ip-${userId}-${Date.now()}`,
            anomalyType: 'geospatial',
            severity: pattern.ips.size > 10 ? 'critical' : 'high',
            description: `User accessing from ${pattern.ips.size} different IP addresses`,
            affectedEntities: [
              { type: 'user', id: userId, name: pattern.activities[0]?.users?.full_name || 'Unknown' }
            ],
            baseline: { normalIPCount: 2 },
            detected: { actualIPCount: pattern.ips.size },
            deviation: pattern.ips.size / 2,
            confidence: 0.85,
            investigationRequired: pattern.ips.size > 8,
            metadata: {
              userId,
              ipAddresses: Array.from(pattern.ips),
              timeSpan: timeRange
            }
          })
        }

        // Simultaneous access from different locations (if we had geolocation data)
        // This would require IP geolocation service integration
      }

      return anomalies
    } catch (error) {
      console.error('Error detecting geospatial anomalies:', error)
      return []
    }
  }

  private static async getOrganizationMetrics(organizationId: string, timeRange: any) {
    // Implementation for organization metrics
    return { averageEngagement: 25 } // Placeholder
  }

  private static async getUserEngagementMetrics(organizationId: string, timeRange: any) {
    // Implementation for user engagement metrics
    return { lowEngagementUsers: [] } // Placeholder
  }

  private static async getSecurityMetrics(organizationId: string, timeRange: any) {
    // Implementation for security metrics
    return { riskScore: 45 } // Placeholder
  }

  private static async detectInefficiencies(organizationId: string, timeRange: any) {
    // Implementation for inefficiency detection
    return [] // Placeholder
  }

  private static async detectComplianceGaps(organizationId: string, timeRange: any) {
    // Implementation for compliance gap detection
    return [] // Placeholder
  }

  private static async calculateOrganizationHealthScore(
    organizationId: string,
    predictions: MLPrediction[],
    anomalies: AnomalyDetection[],
    timeRange: any
  ): Promise<number> {
    let score = 100

    // Deduct for high-risk predictions
    const highRiskPredictions = predictions.filter(p => 
      p.prediction.riskLevel === 'high' || p.prediction.threatLevel === 'high'
    )
    score -= highRiskPredictions.length * 15

    // Deduct for critical anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
    score -= criticalAnomalies.length * 20

    // Deduct for high anomalies
    const highAnomalies = anomalies.filter(a => a.severity === 'high')
    score -= highAnomalies.length * 10

    return Math.max(0, score)
  }

  private static generateInsightsSummary(
    predictions: MLPrediction[],
    anomalies: AnomalyDetection[],
    recommendations: ActivityRecommendation[],
    healthScore: number
  ) {
    const keyInsights = []
    const urgentActions = []

    // Analyze predictions
    const highRiskPredictions = predictions.filter(p => p.confidence > 0.7)
    if (highRiskPredictions.length > 0) {
      keyInsights.push(`${highRiskPredictions.length} high-confidence predictions identified`)
    }

    // Analyze anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
    if (criticalAnomalies.length > 0) {
      keyInsights.push(`${criticalAnomalies.length} critical anomalies require immediate attention`)
      urgentActions.push('Investigate critical security anomalies')
    }

    // Analyze recommendations
    const urgentRecommendations = recommendations.filter(r => r.priority === 'urgent')
    if (urgentRecommendations.length > 0) {
      urgentActions.push(...urgentRecommendations.map(r => r.title))
    }

    // Health score insights
    if (healthScore < 50) {
      keyInsights.push('Organization health score is below acceptable threshold')
      urgentActions.push('Implement comprehensive security and engagement improvements')
    } else if (healthScore < 75) {
      keyInsights.push('Organization health score indicates room for improvement')
    } else {
      keyInsights.push('Organization health score is good')
    }

    return {
      overallHealthScore: healthScore,
      riskLevel: (healthScore < 40 ? 'critical' : 
                  healthScore < 60 ? 'high' :
                  healthScore < 80 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical',
      keyInsights: keyInsights.slice(0, 5), // Top 5 insights
      urgentActions: urgentActions.slice(0, 3) // Top 3 urgent actions
    }
  }

  /**
   * Train and update ML models (placeholder for future ML integration)
   */
  static async trainModels(organizationId: string) {
    // This would integrate with TensorFlow.js or external ML services
    console.log('ML model training not yet implemented')
  }

  /**
   * Predict resource demand
   */
  private static async predictResourceDemand(
    organizationId: string,
    userData: any[]
  ): Promise<MLPrediction> {
    // Analyze growth trends to predict resource needs
    const totalActivity = userData.reduce((sum, day) => sum + day.total_activities, 0)
    const avgDaily = totalActivity / userData.length
    
    // Simple linear regression for growth prediction
    const trend = userData.length > 14 ? 
      (userData.slice(0, 7).reduce((sum, day) => sum + day.total_activities, 0) / 7) -
      (userData.slice(7, 14).reduce((sum, day) => sum + day.total_activities, 0) / 7) : 0

    const projectedGrowth = trend * 30 // 30 days ahead
    const confidence = Math.min(0.8, userData.length / 30) // More data = higher confidence

    return {
      id: `resource-demand-${organizationId}-${Date.now()}`,
      type: 'resource_demand',
      confidence,
      prediction: {
        expectedGrowth: projectedGrowth,
        recommendedCapacity: Math.ceil(avgDaily * 1.5), // 50% buffer
        timeframe: '30 days'
      },
      reasoning: [
        `Current average: ${avgDaily.toFixed(1)} activities/day`,
        `Trend: ${trend > 0 ? 'increasing' : 'stable'} by ${Math.abs(trend).toFixed(1)}/day`,
        `Projected growth: ${projectedGrowth.toFixed(1)} additional activities/month`
      ],
      recommendedActions: [
        'Monitor resource utilization',
        'Plan for capacity scaling',
        'Optimize database performance',
        'Consider caching strategies'
      ],
      timeframe: '30 days',
      metadata: {
        organizationId,
        currentActivity: avgDaily,
        trend,
        dataPoints: userData.length
      }
    }
  }
}