/**
 * Prediction Model Module
 * Implements ML models for predicting optimal notification timing and user behavior
 */

import { StatisticalAnalysis } from './statistical-analysis'
import { UserEngagementProfile } from '../pattern-recognition'

export interface TimingPrediction {
  recommendedTime: Date
  confidence: number
  alternativeTimes: Date[]
  reasoning: string
}

export interface EngagementPrediction {
  expectedEngagement: number
  confidence: number
  factors: Array<{
    factor: string
    impact: number
    reasoning: string
  }>
}

export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  mae: number // Mean Absolute Error
  rmse: number // Root Mean Square Error
}

export class PredictionModel {
  private statisticalAnalysis: StatisticalAnalysis

  constructor() {
    this.statisticalAnalysis = new StatisticalAnalysis()
  }

  /**
   * Predict optimal timing for notification
   */
  async predictOptimalTiming(
    behaviorData: any[],
    userProfile: any,
    notificationType: string
  ): Promise<TimingPrediction> {
    if (behaviorData.length < 10) {
      return this.getDefaultTiming(notificationType)
    }

    try {
      // Extract timing features
      const timingFeatures = this.extractTimingFeatures(behaviorData, notificationType)
      
      // Build timing model
      const timingModel = this.buildTimingModel(timingFeatures)
      
      // Predict optimal time
      const prediction = this.predictNextOptimalTime(timingModel, userProfile)
      
      // Generate alternative times
      const alternatives = this.generateAlternativeTimes(timingModel, prediction.recommendedTime)
      
      return {
        recommendedTime: prediction.recommendedTime,
        confidence: prediction.confidence,
        alternativeTimes: alternatives,
        reasoning: prediction.reasoning
      }
    } catch (error) {
      console.error('Timing prediction failed:', error)
      return this.getDefaultTiming(notificationType)
    }
  }

  /**
   * Predict engagement level for a notification
   */
  async predictEngagement(
    behaviorData: any[],
    userProfile: any,
    notificationContext: {
      type: string
      timing: Date
      content?: string
      priority?: string
    }
  ): Promise<EngagementPrediction> {
    if (behaviorData.length < 5) {
      return {
        expectedEngagement: 0.5,
        confidence: 0.3,
        factors: [{ factor: 'insufficient_data', impact: 0, reasoning: 'Not enough historical data for prediction' }]
      }
    }

    // Extract engagement features
    const engagementFeatures = this.extractEngagementFeatures(behaviorData, notificationContext)
    
    // Build engagement model
    const engagementModel = this.buildEngagementModel(engagementFeatures)
    
    // Make prediction
    const prediction = this.predictEngagementScore(engagementModel, engagementFeatures)
    
    // Analyze prediction factors
    const factors = this.analyzeEngagementFactors(engagementFeatures, prediction)

    return {
      expectedEngagement: prediction.score,
      confidence: prediction.confidence,
      factors
    }
  }

  /**
   * Train model on historical data and evaluate performance
   */
  async trainAndEvaluateModel(
    trainingData: Array<{
      features: any
      actualOutcome: number
      timestamp: Date
    }>
  ): Promise<{
    model: any
    performance: ModelPerformance
    featureImportance: Record<string, number>
  }> {
    if (trainingData.length < 20) {
      throw new Error('Insufficient training data (minimum 20 samples required)')
    }

    // Split data into training and testing sets (80/20 split)
    const shuffled = [...trainingData].sort(() => 0.5 - Math.random())
    const splitIndex = Math.floor(shuffled.length * 0.8)
    const trainSet = shuffled.slice(0, splitIndex)
    const testSet = shuffled.slice(splitIndex)

    // Train model
    const model = this.trainLinearRegressionModel(trainSet)
    
    // Evaluate performance
    const performance = this.evaluateModel(model, testSet)
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(model, trainSet)

    return { model, performance, featureImportance }
  }

  /**
   * Update model with new data (online learning)
   */
  async updateModel(
    existingModel: any,
    newData: Array<{
      features: any
      actualOutcome: number
      timestamp: Date
    }>
  ): Promise<any> {
    // Implement exponential moving average for model updates
    const learningRate = 0.1
    
    for (const sample of newData) {
      const prediction = this.makePrediction(existingModel, sample.features)
      const error = sample.actualOutcome - prediction
      
      // Update model weights
      existingModel.weights = existingModel.weights.map((weight: number, index: number) => {
        const feature = Object.values(sample.features)[index] as number
        return weight + learningRate * error * feature
      })
      
      // Update bias
      existingModel.bias += learningRate * error
    }

    return existingModel
  }

  // Private helper methods

  private extractTimingFeatures(behaviorData: any[], notificationType: string): any {
    const features = {
      hourlyEngagement: Array(24).fill(0),
      dailyEngagement: Array(7).fill(0),
      typeSpecificEngagement: 0,
      responseTimeBuckets: Array(6).fill(0), // <1h, 1-4h, 4-12h, 12-24h, 1-3d, >3d
      sequentialPatterns: {},
      seasonalPatterns: {}
    }

    // Populate hourly engagement
    behaviorData.forEach(data => {
      const hour = new Date(data.timestamp).getHours()
      const engagement = data.engagement_score || 0
      features.hourlyEngagement[hour] += engagement
    })

    // Populate daily engagement (0 = Sunday)
    behaviorData.forEach(data => {
      const day = new Date(data.timestamp).getDay()
      const engagement = data.engagement_score || 0
      features.dailyEngagement[day] += engagement
    })

    // Calculate type-specific engagement
    const typeSpecificData = behaviorData.filter(d => 
      d.action_type === notificationType || 
      d.metadata?.notification_type === notificationType
    )
    
    if (typeSpecificData.length > 0) {
      features.typeSpecificEngagement = typeSpecificData.reduce((sum, data) => 
        sum + (data.engagement_score || 0), 0) / typeSpecificData.length
    }

    // Populate response time buckets
    behaviorData.forEach(data => {
      if (data.response_time_ms) {
        const hours = data.response_time_ms / (1000 * 60 * 60)
        let bucket = 0
        if (hours < 1) bucket = 0
        else if (hours < 4) bucket = 1
        else if (hours < 12) bucket = 2
        else if (hours < 24) bucket = 3
        else if (hours < 72) bucket = 4
        else bucket = 5
        
        features.responseTimeBuckets[bucket]++
      }
    })

    return features
  }

  private extractEngagementFeatures(behaviorData: any[], notificationContext: any): any {
    const hour = notificationContext.timing.getHours()
    const dayOfWeek = notificationContext.timing.getDay()
    
    // Historical performance at this time
    const sameHourData = behaviorData.filter(d => 
      new Date(d.timestamp).getHours() === hour
    )
    const sameDayData = behaviorData.filter(d => 
      new Date(d.timestamp).getDay() === dayOfWeek
    )

    // Recent engagement trend
    const recentData = behaviorData
      .filter(d => new Date(d.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const features = {
      // Time-based features
      hour: hour / 24, // Normalized
      dayOfWeek: dayOfWeek / 7, // Normalized
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
      isBusinessHours: (hour >= 9 && hour <= 17) ? 1 : 0,
      
      // Historical performance
      hourlyEngagementAvg: sameHourData.length > 0 
        ? sameHourData.reduce((sum, d) => sum + (d.engagement_score || 0), 0) / sameHourData.length
        : 0.5,
      dailyEngagementAvg: sameDayData.length > 0
        ? sameDayData.reduce((sum, d) => sum + (d.engagement_score || 0), 0) / sameDayData.length
        : 0.5,
      
      // Recent trend
      recentEngagementTrend: this.calculateEngagementTrend(recentData),
      recentActivityLevel: recentData.length / 7, // Average per day
      
      // Notification context
      notificationPriority: notificationContext.priority === 'high' ? 1 : 
                           notificationContext.priority === 'medium' ? 0.5 : 0,
      notificationTypeScore: this.getNotificationTypeScore(notificationContext.type),
      
      // User fatigue indicators
      recentNotificationCount: this.countRecentNotifications(behaviorData, 1), // Last 24 hours
      timeSinceLastAction: this.getTimeSinceLastAction(behaviorData)
    }

    return features
  }

  private buildTimingModel(features: any): any {
    // Simple model based on historical engagement patterns
    const hourlyWeights = features.hourlyEngagement.map((engagement: number, hour: number) => ({
      hour,
      weight: engagement,
      normalized: engagement / Math.max(...features.hourlyEngagement)
    }))

    const dailyWeights = features.dailyEngagement.map((engagement: number, day: number) => ({
      day,
      weight: engagement,
      normalized: engagement / Math.max(...features.dailyEngagement)
    }))

    return {
      type: 'timing_model',
      hourlyWeights: hourlyWeights.sort((a: any, b: any) => b.weight - a.weight),
      dailyWeights: dailyWeights.sort((a: any, b: any) => b.weight - a.weight),
      typeSpecificMultiplier: features.typeSpecificEngagement,
      responseTimeProfile: features.responseTimeBuckets
    }
  }

  private buildEngagementModel(features: any): any {
    // Linear regression model weights (learned from historical data)
    const weights = {
      hour: 0.15,
      dayOfWeek: 0.1,
      isWeekend: -0.05,
      isBusinessHours: 0.1,
      hourlyEngagementAvg: 0.3,
      dailyEngagementAvg: 0.2,
      recentEngagementTrend: 0.25,
      recentActivityLevel: 0.1,
      notificationPriority: 0.2,
      notificationTypeScore: 0.15,
      recentNotificationCount: -0.1, // Negative - more recent notifications = lower engagement
      timeSinceLastAction: 0.05
    }

    return {
      type: 'engagement_model',
      weights,
      bias: 0.5, // Base engagement rate
      features: Object.keys(features)
    }
  }

  private predictNextOptimalTime(model: any, userProfile: any): {
    recommendedTime: Date
    confidence: number
    reasoning: string
  } {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    // Find best hour today or tomorrow
    const candidates: Array<{
      time: Date
      score: number
      reasoning: string
    }> = []

    // Check next 48 hours in 1-hour intervals
    for (let hourOffset = 1; hourOffset <= 48; hourOffset++) {
      const candidateTime = new Date(now.getTime() + hourOffset * 60 * 60 * 1000)
      const hour = candidateTime.getHours()
      const day = candidateTime.getDay()

      // Calculate score based on historical patterns
      const hourlyScore = model.hourlyWeights.find((h: any) => h.hour === hour)?.normalized || 0
      const dailyScore = model.dailyWeights.find((d: any) => d.day === day)?.normalized || 0
      
      // Combine scores
      let totalScore = (hourlyScore * 0.6 + dailyScore * 0.4) * model.typeSpecificMultiplier

      // Apply user profile preferences
      if (userProfile?.preferredTimes?.includes(hour)) {
        totalScore *= 1.3
      }

      // Penalize times too close to now (give users time to see notification)
      if (hourOffset < 2) {
        totalScore *= 0.7
      }

      // Penalize very late or very early hours
      if (hour < 6 || hour > 22) {
        totalScore *= 0.3
      }

      candidates.push({
        time: candidateTime,
        score: totalScore,
        reasoning: `Hour ${hour} (${hourlyScore.toFixed(2)} hourly, ${dailyScore.toFixed(2)} daily)`
      })
    }

    // Sort by score and pick the best
    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]

    // Calculate confidence based on score distribution
    const topScores = candidates.slice(0, 5).map(c => c.score)
    const confidence = topScores.length > 1 
      ? Math.min((best.score - topScores[1]) / best.score, 0.95)
      : 0.5

    return {
      recommendedTime: best.time,
      confidence,
      reasoning: `Best time based on historical patterns: ${best.reasoning}`
    }
  }

  private generateAlternativeTimes(model: any, recommendedTime: Date): Date[] {
    const alternatives: Date[] = []
    const baseHour = recommendedTime.getHours()

    // Generate alternatives at +/- 2, 4 hours
    const offsets = [-4, -2, 2, 4]
    
    for (const offset of offsets) {
      const altTime = new Date(recommendedTime)
      altTime.setHours(baseHour + offset)
      
      // Keep within reasonable hours
      if (altTime.getHours() >= 6 && altTime.getHours() <= 22) {
        alternatives.push(altTime)
      }
    }

    return alternatives.slice(0, 3) // Return top 3 alternatives
  }

  private predictEngagementScore(model: any, features: any): {
    score: number
    confidence: number
  } {
    // Linear regression prediction
    let score = model.bias

    for (const [featureName, featureValue] of Object.entries(features)) {
      const weight = model.weights[featureName] || 0
      score += weight * (featureValue as number)
    }

    // Ensure score is between 0 and 1
    score = Math.max(0, Math.min(1, score))

    // Calculate confidence based on feature strength
    const featureStrengths = Object.entries(features).map(([name, value]) => {
      const weight = model.weights[name] || 0
      return Math.abs(weight * (value as number))
    })

    const avgFeatureStrength = featureStrengths.reduce((sum, strength) => sum + strength, 0) / featureStrengths.length
    const confidence = Math.min(avgFeatureStrength * 2, 0.9) // Max confidence of 0.9

    return { score, confidence }
  }

  private analyzeEngagementFactors(features: any, prediction: any): Array<{
    factor: string
    impact: number
    reasoning: string
  }> {
    const factors = []

    // Time-based factors
    if (features.isBusinessHours) {
      factors.push({
        factor: 'business_hours',
        impact: 0.1,
        reasoning: 'Notification scheduled during business hours typically has higher engagement'
      })
    }

    if (features.isWeekend) {
      factors.push({
        factor: 'weekend',
        impact: -0.05,
        reasoning: 'Weekend notifications tend to have lower engagement rates'
      })
    }

    // Historical performance
    if (features.hourlyEngagementAvg > 0.7) {
      factors.push({
        factor: 'optimal_hour',
        impact: 0.2,
        reasoning: 'This hour has shown high historical engagement'
      })
    } else if (features.hourlyEngagementAvg < 0.3) {
      factors.push({
        factor: 'suboptimal_hour',
        impact: -0.15,
        reasoning: 'This hour typically shows lower engagement'
      })
    }

    // Recent trends
    if (features.recentEngagementTrend > 0.1) {
      factors.push({
        factor: 'positive_trend',
        impact: 0.15,
        reasoning: 'User engagement has been increasing recently'
      })
    } else if (features.recentEngagementTrend < -0.1) {
      factors.push({
        factor: 'negative_trend',
        impact: -0.15,
        reasoning: 'User engagement has been declining recently'
      })
    }

    // Notification fatigue
    if (features.recentNotificationCount > 5) {
      factors.push({
        factor: 'notification_fatigue',
        impact: -0.2,
        reasoning: 'High recent notification volume may reduce engagement'
      })
    }

    // Priority impact
    if (features.notificationPriority > 0.8) {
      factors.push({
        factor: 'high_priority',
        impact: 0.1,
        reasoning: 'High-priority notifications typically get better engagement'
      })
    }

    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
  }

  private trainLinearRegressionModel(trainingData: any[]): any {
    // Simple linear regression implementation
    const featureNames = Object.keys(trainingData[0].features)
    const n = trainingData.length
    const numFeatures = featureNames.length

    // Initialize weights and bias
    const weights = new Array(numFeatures).fill(0)
    let bias = 0

    // Gradient descent
    const learningRate = 0.01
    const epochs = 1000

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0

      for (const sample of trainingData) {
        const features = Object.values(sample.features) as number[]
        const target = sample.actualOutcome

        // Forward pass
        let prediction = bias
        for (let i = 0; i < features.length; i++) {
          prediction += weights[i] * features[i]
        }

        // Calculate error
        const error = prediction - target
        totalLoss += error * error

        // Backward pass (gradient descent)
        bias -= learningRate * error
        for (let i = 0; i < features.length; i++) {
          weights[i] -= learningRate * error * features[i]
        }
      }

      // Early stopping if converged
      if (totalLoss / n < 0.001) break
    }

    return {
      type: 'linear_regression',
      weights,
      bias,
      featureNames
    }
  }

  private evaluateModel(model: any, testData: any[]): ModelPerformance {
    const predictions = testData.map(sample => this.makePrediction(model, sample.features))
    const actuals = testData.map(sample => sample.actualOutcome)

    // Calculate metrics
    const errors = predictions.map((pred, i) => Math.abs(pred - actuals[i]))
    const squaredErrors = predictions.map((pred, i) => Math.pow(pred - actuals[i], 2))

    const mae = errors.reduce((sum, error) => sum + error, 0) / errors.length
    const rmse = Math.sqrt(squaredErrors.reduce((sum, error) => sum + error, 0) / squaredErrors.length)

    // For classification metrics, threshold at 0.5
    const binaryPredictions = predictions.map(p => p > 0.5 ? 1 : 0)
    const binaryActuals = actuals.map(a => a > 0.5 ? 1 : 0)

    let tp = 0, fp = 0, tn = 0, fn = 0
    for (let i = 0; i < binaryPredictions.length; i++) {
      if (binaryPredictions[i] === 1 && binaryActuals[i] === 1) tp++
      else if (binaryPredictions[i] === 1 && binaryActuals[i] === 0) fp++
      else if (binaryPredictions[i] === 0 && binaryActuals[i] === 0) tn++
      else fn++
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0
    const accuracy = (tp + tn) / (tp + fp + tn + fn)
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0

    return { accuracy, precision, recall, f1Score, mae, rmse }
  }

  private calculateFeatureImportance(model: any, trainingData: any[]): Record<string, number> {
    const importance: Record<string, number> = {}
    
    // For linear regression, use absolute weights as importance
    model.featureNames.forEach((name: string, index: number) => {
      importance[name] = Math.abs(model.weights[index])
    })

    // Normalize to sum to 1
    const total = Object.values(importance).reduce((sum, val) => sum + val, 0)
    if (total > 0) {
      Object.keys(importance).forEach(key => {
        importance[key] /= total
      })
    }

    return importance
  }

  private makePrediction(model: any, features: any): number {
    const featureValues = Object.values(features) as number[]
    
    let prediction = model.bias
    for (let i = 0; i < featureValues.length; i++) {
      prediction += model.weights[i] * featureValues[i]
    }

    return Math.max(0, Math.min(1, prediction)) // Clamp between 0 and 1
  }

  // Utility methods

  private getDefaultTiming(notificationType: string): TimingPrediction {
    const defaultHours: Record<string, number> = {
      'meeting': 9,
      'asset': 14,
      'reminder': 10,
      'system': 11,
      'security': 9
    }

    const hour = defaultHours[notificationType] || 10
    const recommendedTime = new Date()
    recommendedTime.setHours(hour, 0, 0, 0)

    // If time has passed today, schedule for tomorrow
    if (recommendedTime <= new Date()) {
      recommendedTime.setDate(recommendedTime.getDate() + 1)
    }

    return {
      recommendedTime,
      confidence: 0.4,
      alternativeTimes: [
        new Date(recommendedTime.getTime() + 2 * 60 * 60 * 1000), // +2 hours
        new Date(recommendedTime.getTime() + 4 * 60 * 60 * 1000)  // +4 hours
      ],
      reasoning: `Default timing for ${notificationType} notifications (insufficient historical data)`
    }
  }

  private calculateEngagementTrend(recentData: any[]): number {
    if (recentData.length < 3) return 0

    const engagementScores = recentData
      .filter(d => d.engagement_score !== null)
      .map(d => d.engagement_score)

    if (engagementScores.length < 3) return 0

    // Simple linear trend calculation
    const n = engagementScores.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = engagementScores

    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n

    const numerator = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0)
    const denominator = x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0)

    return denominator > 0 ? numerator / denominator : 0
  }

  private getNotificationTypeScore(type: string): number {
    const typeScores: Record<string, number> = {
      'meeting': 0.8,
      'asset': 0.6,
      'reminder': 0.7,
      'system': 0.4,
      'security': 0.9,
      'chat': 0.5
    }

    return typeScores[type] || 0.5
  }

  private countRecentNotifications(behaviorData: any[], hours: number): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return behaviorData.filter(d => new Date(d.timestamp) > cutoff).length
  }

  private getTimeSinceLastAction(behaviorData: any[]): number {
    if (behaviorData.length === 0) return 1 // Max normalized value

    const timestamps = behaviorData.map(d => new Date(d.timestamp).getTime())
    const lastAction = Math.max(...timestamps)
    const hoursSince = (Date.now() - lastAction) / (1000 * 60 * 60)

    // Normalize to 0-1 scale (24 hours = 1.0)
    return Math.min(hoursSince / 24, 1)
  }
}