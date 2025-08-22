/**
 * Predictive Notifications Service
 * Uses ML models to generate smart, personalized notifications with optimal timing
 */

import { databaseService, type DatabaseClient } from './database.service'
import { Database } from '../../types/database'
import { NotificationService } from './notification.service'
import { patternRecognitionEngine } from './pattern-recognition'
import { nanoid } from 'nanoid'

type PredictedNotification = Database['public']['Tables']['predicted_notifications']['Row']
type PredictedNotificationInsert = Database['public']['Tables']['predicted_notifications']['Insert']
type UserBehaviorMetric = Database['public']['Tables']['user_behavior_metrics']['Row']

export interface SmartNotificationRequest {
  userId: string
  organizationId?: string
  type: string
  category: string
  title: string
  message: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
  scheduleOptions?: {
    allowDelay: boolean
    maxDelayHours: number
    preferredTimeRanges?: Array<{ start: number; end: number }>
  }
}

export interface PredictiveInsight {
  type: 'optimal_timing' | 'engagement_forecast' | 'risk_alert' | 'pattern_change'
  title: string
  description: string
  confidence: number
  actionable: boolean
  recommendedActions: string[]
  affectedUsers?: string[]
  data: Record<string, any>
}

export interface NotificationOptimization {
  originalRequest: SmartNotificationRequest
  optimizedTiming: Date
  expectedEngagement: number
  confidence: number
  optimizations: Array<{
    type: 'timing' | 'content' | 'frequency' | 'personalization'
    change: string
    expectedImprovement: number
  }>
}

export class PredictiveNotificationService {
  private supabase: DatabaseClient | null = null
  private notificationService!: NotificationService
  private modelVersion: string = '1.0.0'

  constructor() {
    // Services will be lazily initialized
  }

  private async getSupabase(): Promise<DatabaseClient> {
    if (!this.supabase) {
      this.supabase = await databaseService.getClient()
    }
    return this.supabase
  }

  private async getNotificationService() {
    if (!this.notificationService) {
      const supabase = await this.getSupabase()
      this.notificationService = new NotificationService(supabase)
    }
    return this.notificationService
  }

  /**
   * Generate smart notification with ML-optimized timing and content
   */
  async generateSmartNotification(
    request: SmartNotificationRequest
  ): Promise<{
    predictionId: string
    scheduledTime: Date
    confidence: number
    optimization: NotificationOptimization
  }> {
    try {
      // Get user's behavioral data
      const behaviorData = await this.getUserBehaviorData(request.userId, request.organizationId)
      
      // Generate user engagement profile
      const userProfile = await patternRecognitionEngine.generateUserEngagementProfiles(
        request.organizationId || '',
        [request.userId]
      )
      
      // Predict optimal timing
      const timingPrediction = await patternRecognitionEngine.predictOptimalTiming(
        request.userId,
        request.type,
        request.organizationId
      )

      // Create optimization analysis
      const optimization = await this.createOptimizationAnalysis(
        request,
        timingPrediction,
        behaviorData,
        userProfile[0]
      )

      // Store prediction
      const predictionId = `pred_${nanoid()}`
      const prediction = await this.storePrediction({
        user_id: request.userId,
        prediction_type: request.type,
        predicted_content: {
          title: request.title,
          message: request.message,
          type: request.type,
          priority: request.priority,
          scheduled_time: timingPrediction.recommendedTime.toISOString()
        } as any,
        confidence_score: timingPrediction.confidence,
        prediction_data: {
          original_request: request,
          timing_reasoning: timingPrediction.reasoning,
          optimization: optimization,
          user_profile_summary: userProfile[0] ? {
            segment: userProfile[0].behaviorSegment,
            preferred_times: userProfile[0].preferredTimes,
            peak_days: userProfile[0].responsePatterns.peakEngagementDays
          } : null,
          model_version: this.modelVersion
        } as any,
        is_sent: false
      })

      return {
        predictionId,
        scheduledTime: timingPrediction.recommendedTime,
        confidence: timingPrediction.confidence,
        optimization
      }

    } catch (error) {
      console.error('Smart notification generation failed:', error)
      throw new Error('Failed to generate smart notification')
    }
  }

  /**
   * Process and send notifications that are ready to be sent
   */
  async processScheduledNotifications(): Promise<{
    processed: number
    sent: number
    errors: number
  }> {
    try {
      const now = new Date()
      const scheduledTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now

      // Get predictions ready to be sent
      const { data: readyPredictions } = await (await this.getSupabase())
        .from('predicted_notifications')
        .select('*')
        .eq('is_sent', false)
        .lte('predicted_time', scheduledTime.toISOString())
        .order('predicted_time')
        .limit(50)

      if (!readyPredictions || readyPredictions.length === 0) {
        return { processed: 0, sent: 0, errors: 0 }
      }

      let sent = 0
      let errors = 0

      for (const prediction of readyPredictions) {
        try {
          // Send the notification
          const success = await this.sendPredictedNotification(prediction)
          
          if (success) {
            sent++
            // Update prediction record
            await this.updatePredictionSent((prediction as any).id, true)
          } else {
            errors++
            await this.updatePredictionSent((prediction as any).id, false)
          }

        } catch (error) {
          console.error(`Failed to send prediction ${(prediction as any).id}:`, error)
          errors++
        }
      }

      return {
        processed: readyPredictions.length,
        sent,
        errors
      }

    } catch (error) {
      console.error('Failed to process scheduled notifications:', error)
      throw new Error('Failed to process scheduled notifications')
    }
  }

  /**
   * Generate predictive insights for organization
   */
  async generatePredictiveInsights(
    organizationId: string,
    lookbackDays: number = 30
  ): Promise<PredictiveInsight[]> {
    try {
      const insights: PredictiveInsight[] = []

      // Analyze patterns for optimization opportunities
      const patternAnalysis = await patternRecognitionEngine.analyzePatterns(organizationId, {
        lookbackDays,
        minConfidence: 0.6
      })

      // Convert patterns to insights
      for (const pattern of patternAnalysis) {
        if (pattern.patternType === 'timing') {
          insights.push({
            type: 'optimal_timing',
            title: 'Optimal Notification Timing Discovered',
            description: pattern.description,
            confidence: pattern.confidence,
            actionable: true,
            recommendedActions: [...(pattern.recommendations || [])],
            affectedUsers: [...(pattern.affectedUsers || [])],
            data: {
              pattern_type: pattern.patternType,
              parameters: pattern.parameters,
              potential_actions: pattern.potentialActions
            }
          })
        }

        if (pattern.patternType === 'engagement') {
          insights.push({
            type: 'engagement_forecast',
            title: 'Engagement Pattern Analysis',
            description: pattern.description,
            confidence: pattern.confidence,
            actionable: true,
            recommendedActions: [...(pattern.recommendations || [])],
            affectedUsers: [...(pattern.affectedUsers || [])],
            data: {
              pattern_type: pattern.patternType,
              parameters: pattern.parameters
            }
          })
        }
      }

      // Detect anomalies for risk alerts
      const anomalies = await patternRecognitionEngine.detectAnomalies(organizationId, {
        lookbackDays: 14,
        sensitivity: 'medium'
      })

      for (const anomaly of anomalies) {
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          insights.push({
            type: 'risk_alert',
            title: `${anomaly.anomaly_type.replace('_', ' ').toUpperCase()} Alert`,
            description: `Detected ${anomaly.anomaly_type}: ${anomaly.anomalous_data}`,
            confidence: anomaly.anomaly_score,
            actionable: true,
            recommendedActions: anomaly.recommended_actions || ['Investigate immediately'],
            data: {
              anomaly_type: anomaly.anomaly_type,
              severity: anomaly.severity,
              detection_method: anomaly.detection_method,
              baseline: anomaly.baseline_data,
              anomalous: anomaly.anomalous_data
            }
          })
        }
      }

      // Analyze board activity trends
      const activityTrends = await patternRecognitionEngine.analyzeBoardActivityTrends(
        organizationId,
        'meeting_frequency',
        90
      )

      if (activityTrends.confidence > 0.7) {
        insights.push({
          type: 'pattern_change',
          title: `Board Activity Trend: ${activityTrends.trend.toUpperCase()}`,
          description: `Meeting frequency is ${activityTrends.trend} with ${activityTrends.changeRate.toFixed(1)}% change rate`,
          confidence: activityTrends.confidence,
          actionable: true,
          recommendedActions: activityTrends.insights,
          data: {
            trend: activityTrends.trend,
            change_rate: activityTrends.changeRate,
            seasonality: activityTrends.seasonalityDetected,
            forecast: activityTrends.forecast.slice(0, 7) // Next 7 days
          }
        })
      }

      return insights.sort((a, b) => b.confidence - a.confidence)

    } catch (error) {
      console.error('Failed to generate predictive insights:', error)
      throw new Error('Failed to generate predictive insights')
    }
  }

  /**
   * Optimize notification timing for multiple users
   */
  async optimizeBulkNotifications(
    notifications: SmartNotificationRequest[]
  ): Promise<Array<{
    userId: string
    originalTiming: Date
    optimizedTiming: Date
    expectedImprovement: number
    confidence: number
  }>> {
    const optimizations = []

    for (const notification of notifications) {
      try {
        const result = await this.generateSmartNotification(notification)
        
        // Compare with original timing (assume immediate if not specified)
        const originalTiming = new Date()
        const improvementEstimate = result.optimization.optimizations
          .reduce((sum, opt) => sum + opt.expectedImprovement, 0)

        optimizations.push({
          userId: notification.userId,
          originalTiming,
          optimizedTiming: result.scheduledTime,
          expectedImprovement: improvementEstimate,
          confidence: result.confidence
        })

      } catch (error) {
        console.error(`Failed to optimize notification for user ${notification.userId}:`, error)
      }
    }

    return optimizations
  }

  /**
   * Update prediction with actual outcome for model learning
   */
  async recordNotificationOutcome(
    predictionId: string,
    outcome: {
      opened: boolean
      clicked: boolean
      responseTime?: number
      feedback?: number // -2 to 2 scale
      dismissed: boolean
    }
  ): Promise<void> {
    try {
      const actualOutcome = outcome.clicked ? 'clicked' : 
                          outcome.opened ? 'opened' : 
                          outcome.dismissed ? 'dismissed' : 
                          'ignored'

      const predictionAccuracy: number = await this.calculatePredictionAccuracy(predictionId, outcome)

      const supabase = await this.getSupabase()
      await supabase
        .from('predicted_notifications')
        .update({
          actual_sent_at: new Date().toISOString(),
          actual_outcome: actualOutcome,
          actual_response_time_ms: outcome.responseTime,
          prediction_accuracy: predictionAccuracy,
          feedback_score: outcome.feedback,
          is_successful: outcome.opened || outcome.clicked,
          updated_at: new Date().toISOString()
        } as any)
        .eq('prediction_id', predictionId)

      // Log behavior data for future pattern recognition
      if (outcome.responseTime || outcome.opened) {
        await this.logUserBehavior(predictionId, outcome)
      }

    } catch (error) {
      console.error('Failed to record notification outcome:', error)
      throw new Error('Failed to record notification outcome')
    }
  }

  /**
   * Generate weekly notification performance report
   */
  async generatePerformanceReport(
    organizationId?: string,
    weekOffset: number = 0
  ): Promise<{
    totalPredictions: number
    totalSent: number
    averageAccuracy: number
    engagementRate: number
    topPerformingTimes: string[]
    improvements: string[]
    recommendations: string[]
  }> {
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (weekOffset * 7) - 7)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      let query = (await this.getSupabase())
        .from('predicted_notifications')
        .select('*')
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString())

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: predictions } = await query

      if (!predictions || predictions.length === 0) {
        return {
          totalPredictions: 0,
          totalSent: 0,
          averageAccuracy: 0,
          engagementRate: 0,
          topPerformingTimes: [],
          improvements: [],
          recommendations: ['Not enough data for meaningful analysis']
        }
      }

      const sentPredictions = predictions.filter((p) => (p as any).is_sent)
      const successfulPredictions = predictions.filter((p) => (p as any).is_successful)
      const accuracies = predictions
        .filter((p) => (p as any).prediction_accuracy !== null)
        .map((p) => (p as any).prediction_accuracy)

      const averageAccuracy = accuracies.length > 0
        ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
        : 0

      const engagementRate = sentPredictions.length > 0
        ? successfulPredictions.length / sentPredictions.length
        : 0

      // Analyze top performing times
      const timeAnalysis = this.analyzePerformingTimes(successfulPredictions)
      
      // Generate improvements and recommendations
      const improvements = this.generateImprovements(predictions)
      const recommendations = this.generateRecommendations(predictions, engagementRate, averageAccuracy)

      return {
        totalPredictions: predictions.length,
        totalSent: sentPredictions.length,
        averageAccuracy,
        engagementRate,
        topPerformingTimes: timeAnalysis,
        improvements,
        recommendations
      }

    } catch (error) {
      console.error('Failed to generate performance report:', error)
      throw new Error('Failed to generate performance report')
    }
  }

  // Private helper methods

  private async getUserBehaviorData(
    userId: string,
    organizationId?: string,
    days: number = 30
  ): Promise<UserBehaviorMetric[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    let query = (await this.getSupabase())
      .from('user_behavior_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', cutoff.toISOString())
      .order('timestamp')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data } = await query
    return data || []
  }

  private async createOptimizationAnalysis(
    request: SmartNotificationRequest,
    timingPrediction: any,
    behaviorData: any[],
    userProfile: any
  ): Promise<NotificationOptimization> {
    const originalTime = new Date() // Assume immediate sending as original
    
    const optimizations = []

    // Timing optimization
    if (timingPrediction.confidence > 0.6) {
      const timingImprovement = this.estimateTimingImprovement(timingPrediction.confidence)
      optimizations.push({
        type: 'timing' as const,
        change: `Delayed notification to optimal time: ${timingPrediction.recommendedTime.toLocaleTimeString()}`,
        expectedImprovement: timingImprovement
      })
    }

    // Content optimization based on user preferences
    if (userProfile?.responsePatterns?.preferredNotificationTypes) {
      const contentImprovement = this.estimateContentImprovement(request.type, userProfile)
      if (contentImprovement > 0) {
        optimizations.push({
          type: 'content' as const,
          change: `Optimized for user's preferred content types`,
          expectedImprovement: contentImprovement
        })
      }
    }

    // Frequency optimization
    const recentNotificationCount = behaviorData.filter(d => 
      new Date(d.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length

    if (recentNotificationCount > 5) {
      optimizations.push({
        type: 'frequency' as const,
        change: 'Reduced notification frequency to avoid fatigue',
        expectedImprovement: 15
      })
    }

    // Personalization optimization
    if (userProfile?.behaviorSegment && userProfile.behaviorSegment !== 'sporadic') {
      optimizations.push({
        type: 'personalization' as const,
        change: `Personalized for ${userProfile.behaviorSegment} user segment`,
        expectedImprovement: 10
      })
    }

    return {
      originalRequest: request,
      optimizedTiming: timingPrediction.recommendedTime,
      expectedEngagement: this.calculateExpectedEngagement(timingPrediction, userProfile),
      confidence: timingPrediction.confidence,
      optimizations
    }
  }

  private calculatePriorityScore(priority: string): number {
    const priorityScores = {
      'low': 0.25,
      'medium': 0.5,
      'high': 0.75,
      'critical': 1.0
    }
    return priorityScores[priority as keyof typeof priorityScores] || 0.5
  }

  private async storePrediction(prediction: PredictedNotificationInsert): Promise<PredictedNotification> {
    const { data, error } = await (await this.getSupabase() as any)
      .from('predicted_notifications')
      .insert(prediction)
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to store prediction:', error)
      throw new Error('Failed to store prediction')
    }

    return data
  }

  private async sendPredictedNotification(prediction: PredictedNotification): Promise<boolean> {
    try {
      const originalRequest: SmartNotificationRequest = (prediction.prediction_data as any).original_request

      // Create standard notification
      const notificationService = await this.getNotificationService()
      await notificationService.createNotification({
        type: originalRequest.type as any,
        title: originalRequest.title,
        message: originalRequest.message,
        userId: prediction.user_id,
        metadata: {
          ...originalRequest.metadata,
          prediction_id: prediction.id,
          confidence_score: prediction.confidence_score,
          is_ai_optimized: true
        }
      })

      return true

    } catch (error) {
      console.error('Failed to send predicted notification:', error)
      return false
    }
  }

  private async updatePredictionSent(predictionId: string, success: boolean): Promise<void> {
    const supabase = await this.getSupabase()
    await supabase
      .from('predicted_notifications')
      .update({
        actual_sent_at: new Date().toISOString(),
        is_sent: true,
        is_successful: success,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', predictionId)
  }

  private async calculatePredictionAccuracy(predictionId: string, outcome: any): Promise<number> {
    // Get the prediction
    const { data: prediction } = await (await this.getSupabase())
      .from('predicted_notifications')
      .select('*')
      .eq('prediction_id', predictionId)
      .single()

    if (!prediction) return 0

    // Calculate accuracy based on expected vs actual engagement
    const expectedEngagement = ((prediction as any).prediction_data as any)?.optimization?.expectedEngagement || 0.5
    const actualEngagement = outcome.clicked ? 1.0 : outcome.opened ? 0.7 : outcome.dismissed ? 0.1 : 0

    // Calculate accuracy as inverse of absolute difference
    const accuracy = 1 - Math.abs(expectedEngagement - actualEngagement)
    return Math.max(0, Math.min(1, accuracy))
  }

  private async logUserBehavior(predictionId: string, outcome: any): Promise<void> {
    const { data: prediction } = await (await this.getSupabase())
      .from('predicted_notifications')
      .select('*')
      .eq('prediction_id', predictionId)
      .single()

    if (!prediction) return

    const supabase = await this.getSupabase()
    await supabase
      .from('user_behavior_metrics')
      .insert({
        user_id: (prediction as PredictedNotification).user_id,
        organization_id: null, // Note: predicted_notifications table doesn't have organization_id
        action_type: 'notification_interaction',
        timestamp: new Date().toISOString(),
        context: {
          notification_type: (prediction as PredictedNotification).prediction_type,
          was_predicted: true,
          confidence_score: (prediction as PredictedNotification).confidence_score,
          prediction_id: predictionId
        },
        response_time_ms: outcome.responseTime,
        engagement_score: outcome.clicked ? 1.0 : outcome.opened ? 0.7 : 0.1,
        session_id: null,
        metadata: {
          outcome: outcome,
          ai_optimized: true
        }
      } as any)
  }

  private estimateTimingImprovement(confidence: number): number {
    // Higher confidence = higher expected improvement
    return Math.round(confidence * 30) // Up to 30% improvement
  }

  private estimateContentImprovement(notificationType: string, userProfile: any): number {
    if (!userProfile?.responsePatterns?.preferredNotificationTypes) return 0
    
    if (userProfile.responsePatterns.preferredNotificationTypes.includes(notificationType)) {
      return 15 // 15% improvement for preferred types
    }
    
    return 0
  }

  private calculateExpectedEngagement(timingPrediction: any, userProfile: any): number {
    let baseEngagement = 0.4 // Base engagement rate

    // Increase based on timing confidence
    baseEngagement += timingPrediction.confidence * 0.3

    // Adjust based on user segment
    if (userProfile?.behaviorSegment) {
      const segmentMultipliers: Record<string, number> = {
        'highly_engaged': 1.5,
        'moderate': 1.0,
        'low_engagement': 0.7,
        'sporadic': 0.5
      }
      baseEngagement *= segmentMultipliers[userProfile.behaviorSegment] || 1.0
    }

    return Math.max(0, Math.min(1, baseEngagement))
  }

  private analyzePerformingTimes(successfulPredictions: any[]): string[] {
    const timeSlots: Record<string, number> = {}

    successfulPredictions.forEach(prediction => {
      const time = new Date(prediction.predicted_time)
      const hour = time.getHours()
      let slot = ''

      if (hour >= 6 && hour < 12) slot = 'Morning (6-12)'
      else if (hour >= 12 && hour < 18) slot = 'Afternoon (12-18)'
      else if (hour >= 18 && hour < 22) slot = 'Evening (18-22)'
      else slot = 'Night (22-6)'

      timeSlots[slot] = (timeSlots[slot] || 0) + 1
    })

    return Object.entries(timeSlots)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([slot]) => slot)
  }

  private generateImprovements(predictions: any[]): string[] {
    const improvements = []
    const currentWeekSuccessRate = predictions.filter(p => p.is_successful).length / predictions.length

    if (currentWeekSuccessRate > 0.7) {
      improvements.push('High engagement rate maintained through AI optimization')
    }

    const avgAccuracy = predictions
      .filter(p => p.prediction_accuracy !== null)
      .reduce((sum, p) => sum + p.prediction_accuracy, 0) / predictions.length

    if (avgAccuracy > 0.8) {
      improvements.push('Prediction accuracy improved through continuous learning')
    }

    return improvements
  }

  private generateRecommendations(predictions: any[], engagementRate: number, accuracy: number): string[] {
    const recommendations = []

    if (engagementRate < 0.5) {
      recommendations.push('Consider adjusting notification content strategy')
      recommendations.push('Review user segmentation for better personalization')
    }

    if (accuracy < 0.7) {
      recommendations.push('Collect more user feedback to improve prediction accuracy')
      recommendations.push('Consider expanding behavioral data collection')
    }

    if (predictions.length < 10) {
      recommendations.push('Increase AI-optimized notification usage for better insights')
    }

    const unsuccessfulPredictions = predictions.filter(p => !p.is_successful && p.is_sent)
    if (unsuccessfulPredictions.length > predictions.length * 0.3) {
      recommendations.push('Analyze failed predictions to identify improvement opportunities')
    }

    return recommendations.length > 0 ? recommendations : ['Continue current optimization strategy']
  }
}

// Export singleton instance
export const predictiveNotificationService = new PredictiveNotificationService()