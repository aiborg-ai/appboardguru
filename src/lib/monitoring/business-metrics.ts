/**
 * Business Metrics Monitor
 * - User engagement and behavior tracking
 * - Feature usage analytics
 * - Conversion funnel monitoring
 * - Revenue and business KPI tracking
 * - A/B testing metrics
 */

import { logger } from '@/lib/logging/advanced-logger'
import { performanceMonitor } from './performance-monitor'

export interface UserEngagement {
  userId: string
  sessionId: string
  timestamp: number
  event: string
  properties?: Record<string, any>
  value?: number
}

export interface FeatureUsage {
  feature: string
  users: Set<string>
  totalUsage: number
  averageSessionTime: number
  conversionRate: number
  lastUsed: number
}

export interface ConversionFunnel {
  name: string
  steps: Array<{
    name: string
    users: number
    conversions: number
    conversionRate: number
  }>
  totalConversions: number
  overallConversionRate: number
}

export interface BusinessKPI {
  name: string
  value: number
  target?: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  previousValue?: number
  timestamp: number
}

export interface ABTestResult {
  testId: string
  variant: string
  metric: string
  value: number
  sampleSize: number
  confidence: number
  significant: boolean
}

export interface UserRetention {
  period: '1day' | '7day' | '30day'
  cohortSize: number
  retainedUsers: number
  retentionRate: number
  timestamp: number
}

export class BusinessMetricsMonitor {
  private engagementEvents: UserEngagement[] = []
  private featureUsage = new Map<string, FeatureUsage>()
  private conversionFunnels = new Map<string, ConversionFunnel>()
  private kpis = new Map<string, BusinessKPI>()
  private abTests = new Map<string, Map<string, ABTestResult>>()
  private userSessions = new Map<string, {
    startTime: number
    lastActivity: number
    events: number
    features: Set<string>
  }>()
  private retentionData: UserRetention[] = []

  constructor() {
    this.initializeDefaultKPIs()
    this.startPeriodicCalculations()
  }

  /**
   * Track user engagement event
   */
  trackEngagement(
    userId: string,
    sessionId: string,
    event: string,
    properties?: Record<string, any>,
    value?: number
  ): void {
    const engagement: UserEngagement = {
      userId,
      sessionId,
      timestamp: Date.now(),
      event,
      properties,
      value
    }

    this.engagementEvents.push(engagement)
    
    // Keep only last 10,000 events
    if (this.engagementEvents.length > 10000) {
      this.engagementEvents.shift()
    }

    // Update session tracking
    this.updateUserSession(userId, sessionId, event)

    // Track in performance monitor
    performanceMonitor.recordMetric('user_engagement', 1, 'count', {
      event,
      userId,
      ...properties
    })

    logger.debug('User engagement tracked', {
      userId,
      sessionId,
      event,
      properties
    })
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(
    userId: string,
    sessionId: string,
    feature: string,
    sessionTime?: number
  ): void {
    let usage = this.featureUsage.get(feature)
    
    if (!usage) {
      usage = {
        feature,
        users: new Set(),
        totalUsage: 0,
        averageSessionTime: 0,
        conversionRate: 0,
        lastUsed: 0
      }
      this.featureUsage.set(feature, usage)
    }

    usage.users.add(userId)
    usage.totalUsage++
    usage.lastUsed = Date.now()
    
    if (sessionTime) {
      usage.averageSessionTime = 
        (usage.averageSessionTime + sessionTime) / 2
    }

    // Track engagement event
    this.trackEngagement(userId, sessionId, 'feature_used', {
      feature,
      sessionTime
    })

    // Update user session
    const session = this.userSessions.get(sessionId)
    if (session) {
      session.features.add(feature)
    }

    logger.debug('Feature usage tracked', {
      userId,
      feature,
      totalUsage: usage.totalUsage,
      uniqueUsers: usage.users.size
    })
  }

  /**
   * Track conversion funnel step
   */
  trackConversion(
    userId: string,
    sessionId: string,
    funnelName: string,
    step: string
  ): void {
    let funnel = this.conversionFunnels.get(funnelName)
    
    if (!funnel) {
      funnel = {
        name: funnelName,
        steps: [],
        totalConversions: 0,
        overallConversionRate: 0
      }
      this.conversionFunnels.set(funnelName, funnel)
    }

    // Find or create step
    let stepData = funnel.steps.find(s => s.name === step)
    if (!stepData) {
      stepData = {
        name: step,
        users: 0,
        conversions: 0,
        conversionRate: 0
      }
      funnel.steps.push(stepData)
    }

    stepData.users++
    stepData.conversions++
    
    // Recalculate conversion rates
    this.recalculateFunnelRates(funnel)

    // Track engagement
    this.trackEngagement(userId, sessionId, 'funnel_step', {
      funnel: funnelName,
      step,
      stepIndex: funnel.steps.indexOf(stepData)
    })

    logger.debug('Conversion tracked', {
      userId,
      funnel: funnelName,
      step,
      conversionRate: stepData.conversionRate
    })
  }

  /**
   * Update business KPI
   */
  updateKPI(
    name: string,
    value: number,
    target?: number,
    unit: string = 'count'
  ): void {
    const existing = this.kpis.get(name)
    const previousValue = existing?.value

    const trend: 'up' | 'down' | 'stable' = 
      !previousValue ? 'stable' :
      value > previousValue ? 'up' :
      value < previousValue ? 'down' : 'stable'

    const kpi: BusinessKPI = {
      name,
      value,
      target,
      unit,
      trend,
      previousValue,
      timestamp: Date.now()
    }

    this.kpis.set(name, kpi)

    // Track in performance monitor
    performanceMonitor.recordMetric(`kpi_${name.toLowerCase()}`, value, 'count', {
      target: target?.toString(),
      trend
    })

    // Generate alerts for KPIs missing targets
    if (target && value < target * 0.8) {
      logger.warn(`KPI below target: ${name}`, {
        value,
        target,
        percentage: Math.round((value / target) * 100)
      })
    }

    logger.info('KPI updated', {
      name,
      value,
      target,
      trend,
      unit
    })
  }

  /**
   * Track A/B test result
   */
  trackABTest(
    testId: string,
    variant: string,
    userId: string,
    metric: string,
    value: number
  ): void {
    if (!this.abTests.has(testId)) {
      this.abTests.set(testId, new Map())
    }

    const testResults = this.abTests.get(testId)!
    let result = testResults.get(variant)
    
    if (!result) {
      result = {
        testId,
        variant,
        metric,
        value: 0,
        sampleSize: 0,
        confidence: 0,
        significant: false
      }
      testResults.set(variant, result)
    }

    result.sampleSize++
    result.value = (result.value + value) / 2 // Running average
    
    // Calculate statistical significance (simplified)
    result.confidence = this.calculateConfidence(result.sampleSize, result.value)
    result.significant = result.confidence > 95

    // Track engagement
    this.trackEngagement(userId, '', 'ab_test', {
      testId,
      variant,
      metric,
      value
    })

    logger.debug('A/B test result tracked', {
      testId,
      variant,
      metric,
      value,
      sampleSize: result.sampleSize,
      confidence: result.confidence
    })
  }

  /**
   * Calculate user retention
   */
  calculateRetention(period: '1day' | '7day' | '30day'): UserRetention {
    const periodMs = {
      '1day': 24 * 60 * 60 * 1000,
      '7day': 7 * 24 * 60 * 60 * 1000,
      '30day': 30 * 24 * 60 * 60 * 1000
    }

    const cutoffTime = Date.now() - periodMs[period]
    
    // Get users active before cutoff
    const cohortUsers = new Set<string>()
    const retainedUsers = new Set<string>()

    for (const event of this.engagementEvents) {
      if (event.timestamp < cutoffTime) {
        cohortUsers.add(event.userId)
      } else {
        if (cohortUsers.has(event.userId)) {
          retainedUsers.add(event.userId)
        }
      }
    }

    const retention: UserRetention = {
      period,
      cohortSize: cohortUsers.size,
      retainedUsers: retainedUsers.size,
      retentionRate: cohortUsers.size > 0 
        ? (retainedUsers.size / cohortUsers.size) * 100 
        : 0,
      timestamp: Date.now()
    }

    this.retentionData.push(retention)
    
    // Keep only last 30 retention calculations
    if (this.retentionData.length > 30) {
      this.retentionData.shift()
    }

    // Update KPI
    this.updateKPI(`retention_${period}`, retention.retentionRate, 80, 'percentage')

    return retention
  }

  /**
   * Get engagement analytics
   */
  getEngagementAnalytics(timeframe: number = 3600000): {
    totalEvents: number
    uniqueUsers: number
    topEvents: Array<{ event: string; count: number }>
    eventTrend: Array<{ timestamp: number; count: number }>
  } {
    const cutoffTime = Date.now() - timeframe
    const relevantEvents = this.engagementEvents
      .filter(event => event.timestamp > cutoffTime)

    const uniqueUsers = new Set(relevantEvents.map(e => e.userId)).size
    const eventCounts = new Map<string, number>()
    
    for (const event of relevantEvents) {
      eventCounts.set(event.event, (eventCounts.get(event.event) || 0) + 1)
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Create hourly trend data
    const eventTrend: Array<{ timestamp: number; count: number }> = []
    const hourlyBuckets = Math.ceil(timeframe / 3600000)
    
    for (let i = 0; i < hourlyBuckets; i++) {
      const bucketStart = Date.now() - (i + 1) * 3600000
      const bucketEnd = Date.now() - i * 3600000
      
      const count = relevantEvents.filter(
        event => event.timestamp >= bucketStart && event.timestamp < bucketEnd
      ).length
      
      eventTrend.unshift({ timestamp: bucketStart, count })
    }

    return {
      totalEvents: relevantEvents.length,
      uniqueUsers,
      topEvents,
      eventTrend
    }
  }

  /**
   * Get feature usage report
   */
  getFeatureUsageReport(): Array<{
    feature: string
    uniqueUsers: number
    totalUsage: number
    averageSessionTime: number
    adoptionRate: number
    lastUsed: string
  }> {
    const totalUsers = this.getTotalUniqueUsers()
    
    return Array.from(this.featureUsage.values())
      .map(usage => ({
        feature: usage.feature,
        uniqueUsers: usage.users.size,
        totalUsage: usage.totalUsage,
        averageSessionTime: Math.round(usage.averageSessionTime),
        adoptionRate: totalUsers > 0 ? (usage.users.size / totalUsers) * 100 : 0,
        lastUsed: new Date(usage.lastUsed).toISOString()
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage)
  }

  /**
   * Get conversion funnel report
   */
  getConversionReport(funnelName: string): ConversionFunnel | null {
    return this.conversionFunnels.get(funnelName) || null
  }

  /**
   * Get all KPIs
   */
  getKPIs(): BusinessKPI[] {
    return Array.from(this.kpis.values())
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId?: string): Record<string, ABTestResult[]> {
    if (testId) {
      const testResults = this.abTests.get(testId)
      return testResults 
        ? { [testId]: Array.from(testResults.values()) }
        : {}
    }

    const allResults: Record<string, ABTestResult[]> = {}
    for (const [id, results] of this.abTests.entries()) {
      allResults[id] = Array.from(results.values())
    }
    return allResults
  }

  /**
   * Get retention data
   */
  getRetentionData(): UserRetention[] {
    return [...this.retentionData].sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Export business metrics
   */
  exportMetrics(): {
    engagement: UserEngagement[]
    features: ReturnType<typeof this.getFeatureUsageReport>
    funnels: Array<ConversionFunnel>
    kpis: BusinessKPI[]
    abTests: Record<string, ABTestResult[]>
    retention: UserRetention[]
    summary: {
      totalUsers: number
      totalEvents: number
      activeFeatures: number
      completedFunnels: number
    }
  } {
    return {
      engagement: this.engagementEvents,
      features: this.getFeatureUsageReport(),
      funnels: Array.from(this.conversionFunnels.values()),
      kpis: this.getKPIs(),
      abTests: this.getABTestResults(),
      retention: this.getRetentionData(),
      summary: {
        totalUsers: this.getTotalUniqueUsers(),
        totalEvents: this.engagementEvents.length,
        activeFeatures: this.featureUsage.size,
        completedFunnels: this.conversionFunnels.size
      }
    }
  }

  // Private methods

  private initializeDefaultKPIs(): void {
    const defaultKPIs = [
      { name: 'Daily Active Users', value: 0, target: 1000, unit: 'users' },
      { name: 'Session Duration', value: 0, target: 300, unit: 'seconds' },
      { name: 'Feature Adoption Rate', value: 0, target: 70, unit: 'percentage' },
      { name: 'User Retention (7-day)', value: 0, target: 80, unit: 'percentage' },
      { name: 'Conversion Rate', value: 0, target: 15, unit: 'percentage' }
    ]

    for (const kpi of defaultKPIs) {
      this.updateKPI(kpi.name, kpi.value, kpi.target, kpi.unit)
    }
  }

  private updateUserSession(userId: string, sessionId: string, event: string): void {
    let session = this.userSessions.get(sessionId)
    
    if (!session) {
      session = {
        startTime: Date.now(),
        lastActivity: Date.now(),
        events: 0,
        features: new Set()
      }
      this.userSessions.set(sessionId, session)
    }

    session.lastActivity = Date.now()
    session.events++

    // Update session duration KPI
    const sessionDuration = (session.lastActivity - session.startTime) / 1000
    this.updateKPI('Session Duration', sessionDuration, 300, 'seconds')
  }

  private recalculateFunnelRates(funnel: ConversionFunnel): void {
    if (funnel.steps.length === 0) return

    // Sort steps by order (assuming they're added in order)
    let previousUsers = funnel.steps[0]?.users || 0

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i]
      
      if (i === 0) {
        step.conversionRate = 100 // First step is 100%
      } else {
        step.conversionRate = previousUsers > 0 
          ? (step.users / previousUsers) * 100 
          : 0
      }
      
      previousUsers = step.users
    }

    // Calculate overall conversion rate
    const firstStep = funnel.steps[0]
    const lastStep = funnel.steps[funnel.steps.length - 1]
    
    funnel.overallConversionRate = firstStep && firstStep.users > 0
      ? (lastStep.users / firstStep.users) * 100
      : 0

    funnel.totalConversions = lastStep?.users || 0

    // Update conversion rate KPI
    this.updateKPI('Conversion Rate', funnel.overallConversionRate, 15, 'percentage')
  }

  private calculateConfidence(sampleSize: number, value: number): number {
    // Simplified confidence calculation
    // In reality, this would use proper statistical methods
    if (sampleSize < 30) return 0
    if (sampleSize < 100) return 70
    if (sampleSize < 500) return 85
    return 95
  }

  private getTotalUniqueUsers(): number {
    const allUsers = new Set<string>()
    for (const event of this.engagementEvents) {
      allUsers.add(event.userId)
    }
    return allUsers.size
  }

  private startPeriodicCalculations(): void {
    // Calculate retention metrics every hour
    setInterval(() => {
      this.calculateRetention('1day')
      this.calculateRetention('7day')
      this.calculateRetention('30day')
      
      // Update DAU KPI
      const dailyUsers = this.getDailyActiveUsers()
      this.updateKPI('Daily Active Users', dailyUsers, 1000, 'users')
      
      // Update feature adoption rate
      const adoptionRate = this.calculateFeatureAdoptionRate()
      this.updateKPI('Feature Adoption Rate', adoptionRate, 70, 'percentage')
      
    }, 3600000) // Every hour
  }

  private getDailyActiveUsers(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const activeUsers = new Set<string>()
    
    for (const event of this.engagementEvents) {
      if (event.timestamp > oneDayAgo) {
        activeUsers.add(event.userId)
      }
    }
    
    return activeUsers.size
  }

  private calculateFeatureAdoptionRate(): number {
    if (this.featureUsage.size === 0) return 0
    
    const totalUsers = this.getTotalUniqueUsers()
    if (totalUsers === 0) return 0
    
    const totalFeatureUsers = Array.from(this.featureUsage.values())
      .reduce((sum, usage) => sum + usage.users.size, 0)
    
    return (totalFeatureUsers / (totalUsers * this.featureUsage.size)) * 100
  }
}

// Export singleton instance
export const businessMetrics = new BusinessMetricsMonitor()