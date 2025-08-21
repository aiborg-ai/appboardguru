/**
 * Advanced Activity Analytics Engine
 * Provides real-time metrics, insights, and predictive analytics
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface ActivityMetrics {
  totalActivities: number
  uniqueUsers: number
  engagementRate: number
  topActivities: Array<{ type: string; count: number; trend: number }>
  hourlyDistribution: Array<{ hour: number; count: number }>
  departmentActivity: Array<{ department: string; activity: number; trend: number }>
  riskScore: number
  complianceScore: number
}

export interface UserEngagementData {
  userId: string
  userName: string
  engagementScore: number
  lastActive: string
  activeDays: number
  topActivities: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  predictions: {
    likelyToChurn: boolean
    nextAction: string
    confidenceScore: number
  }
}

export interface ActivityInsight {
  id: string
  type: 'anomaly' | 'prediction' | 'recommendation' | 'trend'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  data: Record<string, any>
  actionRequired: boolean
  confidence: number
  createdAt: string
}

export class ActivityAnalytics {
  /**
   * Get comprehensive activity metrics for an organization
   */
  static async getOrganizationMetrics(
    organizationId: string,
    timeRange: { start: string; end: string } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    }
  ): Promise<ActivityMetrics> {
    const supabase = await createSupabaseServerClient()

    try {
      // Get basic activity counts
      const { data: activityData } = await supabase
        .from('audit_logs')
        .select('event_category, action, created_at, user_id')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      if (!activityData) {
        throw new Error('Failed to fetch activity data')
      }

      // Calculate metrics
      const totalActivities = activityData.length
      const uniqueUsers = new Set(activityData.map(a => a.user_id)).size
      
      // Calculate engagement rate (activities per unique user)
      const engagementRate = uniqueUsers > 0 ? totalActivities / uniqueUsers : 0

      // Top activities with trend calculation
      const activityCounts = activityData.reduce((acc, activity) => {
        const key = `${activity.event_category}:${activity.action}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topActivities = Object.entries(activityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({
          type,
          count,
          trend: await this.calculateTrend(organizationId, type, timeRange)
        }))

      // Hourly distribution
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: activityData.filter(a => 
          new Date(a.created_at).getHours() === hour
        ).length
      }))

      // Get risk and compliance scores
      const riskScore = await this.calculateRiskScore(organizationId, timeRange)
      const complianceScore = await this.calculateComplianceScore(organizationId, timeRange)

      return {
        totalActivities,
        uniqueUsers,
        engagementRate,
        topActivities,
        hourlyDistribution,
        departmentActivity: [], // TODO: Implement when department data is available
        riskScore,
        complianceScore
      }
    } catch (error) {
      console.error('Error calculating organization metrics:', error)
      throw error
    }
  }

  /**
   * Get user engagement data with predictions
   */
  static async getUserEngagementData(
    organizationId: string,
    userId?: string
  ): Promise<UserEngagementData[]> {
    const supabase = await createSupabaseServerClient()

    try {
      // Get user activity data
      let query = supabase
        .from('audit_logs')
        .select(`
          user_id,
          event_category,
          action,
          created_at,
          severity,
          outcome,
          users(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: activityData } = await query

      if (!activityData) return []

      // Group by user and calculate engagement metrics
      const userMetrics = activityData.reduce((acc, activity) => {
        const uid = activity.user_id
        if (!uid) return acc

        if (!acc[uid]) {
          acc[uid] = {
            userId: uid,
            userName: activity.users?.full_name || activity.users?.email || 'Unknown',
            activities: [],
            activeDays: new Set(),
            riskEvents: 0
          }
        }

        acc[uid].activities.push(activity)
        acc[uid].activeDays.add(new Date(activity.created_at).toDateString())
        
        if (activity.severity === 'high' || activity.severity === 'critical' || activity.outcome === 'failure') {
          acc[uid].riskEvents++
        }

        return acc
      }, {} as Record<string, any>)

      // Convert to engagement data
      const engagementData: UserEngagementData[] = []

      for (const [uid, userData] of Object.entries(userMetrics)) {
        const activities = userData.activities
        const activeDays = userData.activeDays.size
        const totalActivities = activities.length

        // Calculate engagement score using the database function
        const { data: engagementScore } = await supabase
          .rpc('calculate_user_engagement_score', {
            input_user_id: uid,
            input_org_id: organizationId,
            days_back: 30
          })

        // Calculate risk level
        const riskLevel = userData.riskEvents > 10 ? 'critical' :
                         userData.riskEvents > 5 ? 'high' :
                         userData.riskEvents > 2 ? 'medium' : 'low'

        // Get top activity types
        const activityTypes = activities.reduce((acc: Record<string, number>, activity: any) => {
          const type = `${activity.event_category}:${activity.action}`
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {})

        const topActivities = Object.entries(activityTypes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type)

        // Simple churn prediction (can be enhanced with ML)
        const lastActivity = new Date(Math.max(...activities.map((a: any) => new Date(a.created_at).getTime())))
        const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        const likelyToChurn = daysSinceLastActivity > 7 && engagementScore < 20

        engagementData.push({
          userId: uid,
          userName: userData.userName,
          engagementScore: engagementScore || 0,
          lastActive: lastActivity.toISOString(),
          activeDays,
          topActivities,
          riskLevel: riskLevel as any,
          predictions: {
            likelyToChurn,
            nextAction: likelyToChurn ? 'Re-engagement needed' : topActivities[0] || 'Continue monitoring',
            confidenceScore: Math.min(0.9, totalActivities / 100) // Higher confidence with more data
          }
        })
      }

      return engagementData.sort((a, b) => b.engagementScore - a.engagementScore)
    } catch (error) {
      console.error('Error calculating user engagement:', error)
      return []
    }
  }

  /**
   * Generate AI-powered activity insights
   */
  static async generateInsights(organizationId: string): Promise<ActivityInsight[]> {
    const supabase = await createSupabaseServerClient()
    const insights: ActivityInsight[] = []

    try {
      // Anomaly detection
      const anomalies = await this.detectAnomalies(organizationId)
      insights.push(...anomalies)

      // Trend analysis
      const trends = await this.analyzeTrends(organizationId)
      insights.push(...trends)

      // Compliance insights
      const compliance = await this.generateComplianceInsights(organizationId)
      insights.push(...compliance)

      // Store insights in database
      if (insights.length > 0) {
        const insightInserts = insights.map(insight => ({
          organization_id: organizationId,
          insight_type: insight.type,
          insight_category: insight.type === 'anomaly' ? 'security' : 'engagement',
          title: insight.title,
          description: insight.description,
          confidence_score: insight.confidence,
          risk_level: insight.severity,
          insight_data: insight.data,
          action_required: insight.actionRequired
        }))

        await supabase
          .from('activity_insights')
          .insert(insightInserts)
      }

      return insights
    } catch (error) {
      console.error('Error generating insights:', error)
      return []
    }
  }

  private static async detectAnomalies(organizationId: string): Promise<ActivityInsight[]> {
    const supabase = await createSupabaseServerClient()
    const insights: ActivityInsight[] = []

    try {
      // Get user activity anomalies
      const { data: users } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (!users) return insights

      for (const user of users) {
        const { data: anomalyData } = await supabase
          .rpc('detect_activity_anomalies', {
            input_user_id: user.user_id,
            input_org_id: organizationId
          })

        if (anomalyData) {
          const anomalies = anomalyData as any

          if (anomalies.high_activity) {
            insights.push({
              id: `anomaly-${user.user_id}-high-activity`,
              type: 'anomaly',
              severity: 'warning',
              title: 'Unusually High Activity Detected',
              description: `User has ${anomalies.activity_today} activities today, significantly above their average of ${Math.round(anomalies.average_daily)}`,
              data: anomalies,
              actionRequired: false,
              confidence: 0.85,
              createdAt: new Date().toISOString()
            })
          }

          if (anomalies.unusual_hours) {
            insights.push({
              id: `anomaly-${user.user_id}-unusual-hours`,
              type: 'anomaly',
              severity: 'critical',
              title: 'After-Hours Activity Detected',
              description: `User has ${anomalies.unusual_hours_count} activities outside normal business hours today`,
              data: anomalies,
              actionRequired: true,
              confidence: 0.95,
              createdAt: new Date().toISOString()
            })
          }

          if (anomalies.bulk_downloads) {
            insights.push({
              id: `anomaly-${user.user_id}-bulk-downloads`,
              type: 'anomaly',
              severity: 'critical',
              title: 'Bulk Download Activity',
              description: `User has downloaded ${anomalies.downloads_today} assets today, which may indicate data exfiltration`,
              data: anomalies,
              actionRequired: true,
              confidence: 0.90,
              createdAt: new Date().toISOString()
            })
          }
        }
      }

      return insights
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return []
    }
  }

  private static async analyzeTrends(organizationId: string): Promise<ActivityInsight[]> {
    const supabase = await createSupabaseServerClient()
    const insights: ActivityInsight[] = []

    try {
      // Analyze activity trends over the past 30 days
      const { data: trendData } = await supabase
        .from('daily_activity_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('activity_date', { ascending: true })

      if (!trendData || trendData.length < 7) return insights

      // Calculate weekly trends
      const recentWeek = trendData.slice(-7)
      const previousWeek = trendData.slice(-14, -7)

      const recentAvg = recentWeek.reduce((sum, day) => sum + day.total_activities, 0) / 7
      const previousAvg = previousWeek.reduce((sum, day) => sum + day.total_activities, 0) / 7
      const trendChange = ((recentAvg - previousAvg) / previousAvg) * 100

      if (Math.abs(trendChange) > 25) {
        insights.push({
          id: `trend-activity-${Date.now()}`,
          type: 'trend',
          severity: Math.abs(trendChange) > 50 ? 'warning' : 'info',
          title: trendChange > 0 ? 'Activity Spike Detected' : 'Activity Decline Detected',
          description: `Organization activity has ${trendChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(trendChange).toFixed(1)}% this week`,
          data: {
            trendChange,
            recentAverage: recentAvg,
            previousAverage: previousAvg,
            weeklyData: { recentWeek, previousWeek }
          },
          actionRequired: Math.abs(trendChange) > 50,
          confidence: 0.80,
          createdAt: new Date().toISOString()
        })
      }

      return insights
    } catch (error) {
      console.error('Error analyzing trends:', error)
      return []
    }
  }

  private static async generateComplianceInsights(organizationId: string): Promise<ActivityInsight[]> {
    const supabase = await createSupabaseServerClient()
    const insights: ActivityInsight[] = []

    try {
      // Check for compliance violations
      const { data: violations } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .in('event_type', ['security_event', 'compliance'])
        .eq('outcome', 'failure')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (violations && violations.length > 0) {
        insights.push({
          id: `compliance-violations-${Date.now()}`,
          type: 'anomaly',
          severity: 'critical',
          title: 'Compliance Violations Detected',
          description: `${violations.length} compliance violations found in the past 7 days`,
          data: {
            violationCount: violations.length,
            violationTypes: violations.map(v => v.event_category),
            recentViolations: violations.slice(0, 5)
          },
          actionRequired: true,
          confidence: 1.0,
          createdAt: new Date().toISOString()
        })
      }

      // Check for missing activity (potential compliance gap)
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

      if (!recentActivity || recentActivity.length === 0) {
        insights.push({
          id: `compliance-gap-${Date.now()}`,
          type: 'recommendation',
          severity: 'warning',
          title: 'Activity Gap Detected',
          description: 'No activity recorded in the past 48 hours, which may indicate logging issues',
          data: {
            gapDuration: '48 hours',
            lastActivity: recentActivity?.[0]?.created_at || 'Unknown'
          },
          actionRequired: true,
          confidence: 0.75,
          createdAt: new Date().toISOString()
        })
      }

      return insights
    } catch (error) {
      console.error('Error generating compliance insights:', error)
      return []
    }
  }

  private static async calculateTrend(
    organizationId: string,
    activityType: string,
    timeRange: { start: string; end: string }
  ): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Get this period vs previous period
      const periodDuration = new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()
      const previousStart = new Date(new Date(timeRange.start).getTime() - periodDuration).toISOString()
      const previousEnd = timeRange.start

      const [currentPeriod, previousPeriod] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .ilike('action', `%${activityType.split(':')[1]}%`)
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end),
        
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .ilike('action', `%${activityType.split(':')[1]}%`)
          .gte('created_at', previousStart)
          .lte('created_at', previousEnd)
      ])

      const currentCount = currentPeriod.count || 0
      const previousCount = previousPeriod.count || 0

      if (previousCount === 0) return currentCount > 0 ? 100 : 0
      
      return ((currentCount - previousCount) / previousCount) * 100
    } catch (error) {
      console.error('Error calculating trend:', error)
      return 0
    }
  }

  private static async calculateRiskScore(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data: riskEvents } = await supabase
        .from('audit_logs')
        .select('severity, outcome, event_type')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      if (!riskEvents) return 0

      let riskScore = 0
      riskEvents.forEach(event => {
        // Weight by severity
        if (event.severity === 'critical') riskScore += 10
        else if (event.severity === 'high') riskScore += 5
        else if (event.severity === 'medium') riskScore += 2
        else riskScore += 1

        // Weight by outcome
        if (event.outcome === 'failure' || event.outcome === 'error') riskScore += 3
        if (event.event_type === 'security_event') riskScore += 5
      })

      // Normalize to 0-100 scale
      return Math.min(100, riskScore)
    } catch (error) {
      console.error('Error calculating risk score:', error)
      return 0
    }
  }

  private static async calculateComplianceScore(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient()

      // Check various compliance factors
      const [
        { data: totalEvents },
        { data: securityEvents },
        { data: failureEvents },
        { data: auditCoverage }
      ] = await Promise.all([
        // Total events
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end),

        // Security events
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('event_type', 'security_event')
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end),

        // Failed events
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('outcome', 'failure')
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end),

        // Check audit coverage (all major actions should be logged)
        supabase
          .from('audit_logs')
          .select('event_category')
          .eq('organization_id', organizationId)
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end)
      ])

      const totalCount = totalEvents?.count || 0
      const securityCount = securityEvents?.count || 0
      const failureCount = failureEvents?.count || 0
      const coverageCategories = new Set(auditCoverage?.map(e => e.event_category) || [])

      // Calculate compliance score (0-100)
      let score = 100

      // Deduct for security events
      score -= Math.min(30, securityCount * 2)

      // Deduct for failures
      score -= Math.min(20, (failureCount / Math.max(1, totalCount)) * 100)

      // Deduct for poor audit coverage
      const expectedCategories = ['authentication', 'assets', 'vaults', 'annotations', 'organizations']
      const missingCategories = expectedCategories.filter(cat => !coverageCategories.has(cat))
      score -= missingCategories.length * 10

      // Ensure minimum score
      return Math.max(0, score)
    } catch (error) {
      console.error('Error calculating compliance score:', error)
      return 50 // Default middle score on error
    }
  }

  /**
   * Get real-time activity stream
   */
  static async getActivityStream(
    organizationId: string,
    filters: {
      userId?: string
      activityTypes?: string[]
      timeRange?: { start: string; end: string }
      limit?: number
    } = {}
  ) {
    try {
      const supabase = await createSupabaseServerClient()

      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          event_type,
          event_category,
          action,
          event_description,
          created_at,
          user_id,
          resource_type,
          resource_id,
          outcome,
          severity,
          details,
          users(full_name, email, avatar_url)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.activityTypes?.length) {
        query = query.in('event_category', filters.activityTypes)
      }

      if (filters.timeRange) {
        query = query
          .gte('created_at', filters.timeRange.start)
          .lte('created_at', filters.timeRange.end)
      } else {
        // Default to last 24 hours
        query = query.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      }

      const { data: activities } = await query.limit(filters.limit || 50)

      return activities || []
    } catch (error) {
      console.error('Error fetching activity stream:', error)
      return []
    }
  }
}

/**
 * Background job functions for periodic analytics updates
 */
export class ActivityAnalyticsJobs {
  /**
   * Calculate and store daily analytics
   */
  static async runDailyAnalytics() {
    try {
      const supabase = supabaseAdmin

      // Get all active organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name')

      if (!organizations) return

      for (const org of organizations) {
        try {
          // Calculate and store metrics
          const metrics = await ActivityAnalytics.getOrganizationMetrics(org.id)
          
          await supabase
            .from('activity_analytics')
            .insert({
              organization_id: org.id,
              metric_type: 'daily_summary',
              metric_category: 'organization',
              time_period: `[${new Date().toISOString()}, ${new Date().toISOString()}]`,
              metric_data: metrics,
              expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
            })

          // Generate insights
          await ActivityAnalytics.generateInsights(org.id)

          console.log(`✅ Daily analytics completed for organization: ${org.name}`)
        } catch (error) {
          console.error(`❌ Daily analytics failed for organization ${org.name}:`, error)
        }
      }
    } catch (error) {
      console.error('❌ Daily analytics job failed:', error)
    }
  }

  /**
   * Refresh materialized views
   */
  static async refreshAnalyticsViews() {
    try {
      const supabase = supabaseAdmin
      await supabase.rpc('refresh_daily_activity_summary')
      console.log('✅ Analytics views refreshed')
    } catch (error) {
      console.error('❌ Failed to refresh analytics views:', error)
    }
  }

  /**
   * Cleanup expired analytics data
   */
  static async cleanupExpiredData() {
    try {
      const supabase = supabaseAdmin

      // Remove expired analytics
      await supabase
        .from('activity_analytics')
        .delete()
        .lt('expires_at', new Date().toISOString())

      // Remove old insights (keep for 30 days)
      await supabase
        .from('activity_insights')
        .delete()
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      console.log('✅ Expired analytics data cleaned up')
    } catch (error) {
      console.error('❌ Failed to cleanup expired data:', error)
    }
  }
}