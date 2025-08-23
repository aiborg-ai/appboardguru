import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'
import { CrisisLevel, CrisisCategory } from './crisis-management.service'

export enum MonitoringSource {
  NEWS_FEEDS = 'news_feeds',
  SOCIAL_MEDIA = 'social_media',
  MARKET_DATA = 'market_data',
  REGULATORY_FEEDS = 'regulatory_feeds',
  INTERNAL_SYSTEMS = 'internal_systems',
  COMPETITOR_MONITORING = 'competitor_monitoring',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  RISK_INDICATORS = 'risk_indicators',
  OPERATIONAL_METRICS = 'operational_metrics',
  FINANCIAL_INDICATORS = 'financial_indicators'
}

export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated'
}

export interface MonitoringConfiguration {
  id: string
  name: string
  description: string
  source: MonitoringSource
  category: CrisisCategory
  keywords: string[]
  negative_keywords: string[]
  geographic_filters?: string[]
  language_filters: string[]
  sources_whitelist?: string[]
  sources_blacklist?: string[]
  sentiment_threshold?: number
  volume_threshold?: number
  velocity_threshold?: number
  scoring_weights: {
    relevance: number
    sentiment: number
    volume: number
    source_credibility: number
    temporal_urgency: number
  }
  alert_conditions: AlertCondition[]
  active: boolean
  scan_frequency_minutes: number
  retention_days: number
  last_scan?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface AlertCondition {
  id: string
  name: string
  condition_type: 'threshold' | 'pattern' | 'anomaly' | 'correlation'
  parameters: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'matches'
    value: any
    time_window_minutes?: number
    consecutive_occurrences?: number
  }
  severity: AlertSeverity
  auto_escalate: boolean
  escalation_delay_minutes?: number
}

export interface SituationAlert {
  id: string
  configuration_id: string
  alert_type: 'keyword_match' | 'sentiment_spike' | 'volume_surge' | 'anomaly_detection' | 'correlation_found'
  severity: AlertSeverity
  status: AlertStatus
  title: string
  description: string
  source_data: {
    source: MonitoringSource
    original_content?: string
    url?: string
    publication_date?: string
    author?: string
    social_metrics?: {
      likes: number
      shares: number
      comments: number
      reach?: number
    }
  }
  analysis: {
    relevance_score: number
    sentiment_score: number
    urgency_score: number
    credibility_score: number
    impact_potential: number
    confidence_level: number
    key_entities: string[]
    topics: string[]
    risk_factors: string[]
  }
  geographic_context?: {
    country: string
    region?: string
    city?: string
    coordinates?: [number, number]
  }
  temporal_context: {
    detected_at: string
    content_timestamp?: string
    trending_duration?: number
    peak_intensity?: number
  }
  correlation_data?: {
    related_alerts: string[]
    pattern_matches: string[]
    historical_similarity: number
  }
  actions_taken: AlertAction[]
  assigned_to?: string
  acknowledged_by?: string
  acknowledged_at?: string
  resolved_at?: string
  escalated_to?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AlertAction {
  id: string
  action_type: 'notification' | 'escalation' | 'investigation' | 'response' | 'suppression'
  description: string
  performed_by: string
  performed_at: string
  details: Record<string, any>
  outcome?: string
}

export interface MonitoringDashboard {
  id: string
  name: string
  description: string
  owner_id: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
  refresh_interval_seconds: number
  alert_settings: {
    show_all_alerts: boolean
    severity_filter: AlertSeverity[]
    source_filter: MonitoringSource[]
    auto_acknowledge_low: boolean
  }
  sharing_settings: {
    is_public: boolean
    shared_with_roles: string[]
    external_sharing_enabled: boolean
    external_share_key?: string
  }
  created_at: string
  updated_at: string
}

export interface DashboardLayout {
  columns: number
  rows: number
  grid_size: 'small' | 'medium' | 'large'
}

export interface DashboardWidget {
  id: string
  widget_type: 'alert_feed' | 'metric_chart' | 'heatmap' | 'timeline' | 'sentiment_gauge' | 'risk_meter' | 'news_feed' | 'social_feed'
  title: string
  position: { x: number; y: number; width: number; height: number }
  configuration: {
    data_source: MonitoringSource[]
    time_range: 'last_hour' | 'last_6_hours' | 'last_24_hours' | 'last_week' | 'custom'
    custom_range?: { start: string; end: string }
    filters: Record<string, any>
    display_options: Record<string, any>
    refresh_rate: number
  }
  is_visible: boolean
}

export interface DashboardFilter {
  field: string
  operator: string
  value: any
  active: boolean
}

export interface TrendAnalysis {
  metric: string
  time_period: 'hourly' | 'daily' | 'weekly'
  data_points: Array<{
    timestamp: string
    value: number
    context?: string
  }>
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  change_percentage: number
  statistical_significance: number
  anomalies: Array<{
    timestamp: string
    expected_value: number
    actual_value: number
    deviation_score: number
  }>
  forecasts: Array<{
    timestamp: string
    predicted_value: number
    confidence_interval: [number, number]
  }>
}

export interface SentimentAnalysis {
  overall_sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  sentiment_score: number // -1 to 1
  emotion_breakdown: {
    anger: number
    fear: number
    sadness: number
    disgust: number
    surprise: number
    joy: number
    trust: number
    anticipation: number
  }
  topic_sentiment: Array<{
    topic: string
    sentiment: number
    confidence: number
    mention_count: number
  }>
  temporal_sentiment: Array<{
    timestamp: string
    sentiment: number
    volume: number
  }>
  influence_metrics: {
    reach: number
    engagement: number
    amplification_factor: number
    key_influencers: string[]
  }
}

export interface RiskIndicator {
  id: string
  name: string
  category: CrisisCategory
  current_level: CrisisLevel
  threshold_levels: {
    low: number
    medium: number
    high: number
    critical: number
  }
  current_value: number
  historical_average: number
  trend: 'improving' | 'stable' | 'deteriorating'
  components: Array<{
    component: string
    weight: number
    value: number
    contribution: number
  }>
  last_updated: string
  next_calculation: string
}

export interface CompetitorIntelligence {
  competitor_name: string
  monitoring_areas: string[]
  recent_activities: Array<{
    activity_type: string
    description: string
    impact_assessment: CrisisLevel
    detected_at: string
    source_url?: string
  }>
  market_position_changes: Array<{
    metric: string
    previous_value: number
    current_value: number
    change_percentage: number
    timestamp: string
  }>
  sentiment_comparison: {
    our_sentiment: number
    competitor_sentiment: number
    relative_position: 'better' | 'similar' | 'worse'
  }
}

// Input validation schemas
const CreateMonitoringConfigSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  source: z.nativeEnum(MonitoringSource),
  category: z.nativeEnum(CrisisCategory),
  keywords: z.array(z.string()).min(1),
  negative_keywords: z.array(z.string()).optional(),
  geographic_filters: z.array(z.string()).optional(),
  language_filters: z.array(z.string()).min(1),
  scan_frequency_minutes: z.number().min(5).max(1440),
  alert_conditions: z.array(z.object({
    name: z.string(),
    condition_type: z.enum(['threshold', 'pattern', 'anomaly', 'correlation']),
    parameters: z.object({
      metric: z.string(),
      operator: z.enum(['>', '<', '>=', '<=', '==', '!=', 'contains', 'matches']),
      value: z.any(),
      time_window_minutes: z.number().optional(),
      consecutive_occurrences: z.number().optional()
    }),
    severity: z.nativeEnum(AlertSeverity),
    auto_escalate: z.boolean(),
    escalation_delay_minutes: z.number().optional()
  }))
})

const UpdateAlertSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  assigned_to: z.string().uuid().optional(),
  acknowledged_by: z.string().uuid().optional(),
  escalated_to: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
})

export class SituationMonitoringService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * MONITORING CONFIGURATION
   */

  async createMonitoringConfiguration(
    data: z.infer<typeof CreateMonitoringConfigSchema>
  ): Promise<Result<MonitoringConfiguration>> {
    const validatedData = this.validateWithContext(data, CreateMonitoringConfigSchema, 'create monitoring configuration')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'monitoring_configurations',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const configuration: MonitoringConfiguration = {
        id: crypto.randomUUID(),
        name: validatedData.data.name,
        description: validatedData.data.description,
        source: validatedData.data.source,
        category: validatedData.data.category,
        keywords: validatedData.data.keywords,
        negative_keywords: validatedData.data.negative_keywords || [],
        geographic_filters: validatedData.data.geographic_filters,
        language_filters: validatedData.data.language_filters,
        sources_whitelist: [],
        sources_blacklist: [],
        sentiment_threshold: 0.5,
        volume_threshold: 100,
        velocity_threshold: 10,
        scoring_weights: {
          relevance: 0.3,
          sentiment: 0.2,
          volume: 0.2,
          source_credibility: 0.2,
          temporal_urgency: 0.1
        },
        alert_conditions: validatedData.data.alert_conditions.map(condition => ({
          ...condition,
          id: crypto.randomUUID()
        })),
        active: true,
        scan_frequency_minutes: validatedData.data.scan_frequency_minutes,
        retention_days: 30,
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdConfig, error } = await this.supabase
        .from('monitoring_configurations')
        .insert(configuration)
        .select()
        .single()

      if (error) throw error

      // Start monitoring for this configuration
      await this.startMonitoring(configuration.id)

      await this.logActivity('create_monitoring_configuration', 'monitoring_configuration', configuration.id, {
        source: configuration.source,
        category: configuration.category,
        keywords_count: configuration.keywords.length
      })

      return createdConfig as MonitoringConfiguration
    }, 'createMonitoringConfiguration')
  }

  async updateMonitoringConfiguration(
    configId: string,
    updates: Partial<Omit<MonitoringConfiguration, 'id' | 'created_by' | 'created_at'>>
  ): Promise<Result<MonitoringConfiguration>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: config, error } = await this.supabase
        .from('monitoring_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
        .select()
        .single()

      if (error) throw error

      // Restart monitoring if configuration changed
      if (updates.active !== undefined || updates.keywords || updates.alert_conditions) {
        await this.restartMonitoring(configId)
      }

      await this.logActivity('update_monitoring_configuration', 'monitoring_configuration', configId)
      
      return config as MonitoringConfiguration
    }, 'updateMonitoringConfiguration')
  }

  /**
   * REAL-TIME MONITORING
   */

  async processMonitoringData(
    sourceData: {
      source: MonitoringSource
      content: any
      metadata: Record<string, any>
    }
  ): Promise<Result<SituationAlert[]>> {
    return this.executeDbOperation(async () => {
      // Get active monitoring configurations for this source
      const { data: configs, error } = await this.supabase
        .from('monitoring_configurations')
        .select('*')
        .eq('source', sourceData.source)
        .eq('active', true)

      if (error) throw error

      const alerts: SituationAlert[] = []

      for (const config of configs) {
        try {
          const configAlerts = await this.analyzeContentForConfiguration(sourceData, config)
          alerts.push(...configAlerts)
        } catch (error) {
          console.error(`Failed to analyze content for configuration ${config.id}:`, error)
        }
      }

      // Save alerts to database
      if (alerts.length > 0) {
        const { error: insertError } = await this.supabase
          .from('situation_alerts')
          .insert(alerts)

        if (insertError) throw insertError

        // Process high-severity alerts
        for (const alert of alerts) {
          if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY) {
            await this.processHighSeverityAlert(alert)
          }
        }
      }

      return alerts
    }, 'processMonitoringData')
  }

  private async analyzeContentForConfiguration(
    sourceData: { source: MonitoringSource; content: any; metadata: Record<string, any> },
    config: MonitoringConfiguration
  ): Promise<SituationAlert[]> {
    const alerts: SituationAlert[] = []
    const content = this.extractTextContent(sourceData.content)

    // Check keyword matches
    const keywordMatches = this.findKeywordMatches(content, config.keywords, config.negative_keywords)
    if (keywordMatches.relevance_score === 0) {
      return alerts // No relevant content found
    }

    // Perform sentiment analysis
    const sentimentAnalysis = await this.analyzeSentiment(content)

    // Calculate urgency and impact scores
    const urgencyScore = this.calculateUrgencyScore(sourceData, config)
    const credibilityScore = this.calculateCredibilityScore(sourceData)
    const impactPotential = this.calculateImpactPotential(keywordMatches, sentimentAnalysis, config)

    // Check alert conditions
    for (const condition of config.alert_conditions) {
      if (this.evaluateAlertCondition(condition, {
        relevance_score: keywordMatches.relevance_score,
        sentiment_score: sentimentAnalysis.sentiment_score,
        urgency_score: urgencyScore,
        credibility_score: credibilityScore,
        impact_potential: impactPotential
      })) {
        const alert = this.createAlert(
          config,
          condition,
          sourceData,
          keywordMatches,
          sentimentAnalysis,
          urgencyScore,
          credibilityScore,
          impactPotential
        )
        alerts.push(alert)
      }
    }

    return alerts
  }

  private findKeywordMatches(
    content: string,
    keywords: string[],
    negativeKeywords: string[] = []
  ): { relevance_score: number; matched_keywords: string[]; context: string[] } {
    const lowerContent = content.toLowerCase()
    const matchedKeywords = keywords.filter(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    )

    const negativeMatches = negativeKeywords.filter(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    )

    // Reduce relevance if negative keywords are found
    let relevanceScore = matchedKeywords.length / keywords.length
    if (negativeMatches.length > 0) {
      relevanceScore *= Math.max(0.1, 1 - (negativeMatches.length / negativeKeywords.length))
    }

    // Extract context around matches
    const context = matchedKeywords.map(keyword => {
      const index = lowerContent.indexOf(keyword.toLowerCase())
      const start = Math.max(0, index - 50)
      const end = Math.min(content.length, index + keyword.length + 50)
      return content.substring(start, end).trim()
    })

    return {
      relevance_score: relevanceScore,
      matched_keywords: matchedKeywords,
      context
    }
  }

  private async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    // Simplified sentiment analysis - in production would use ML service
    const words = content.toLowerCase().split(/\W+/)
    
    // Basic sentiment word lists
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'improvement']
    const negativeWords = ['bad', 'terrible', 'crisis', 'problem', 'failure', 'decline', 'risk']

    const positiveCount = words.filter(word => positiveWords.includes(word)).length
    const negativeCount = words.filter(word => negativeWords.includes(word)).length
    
    const sentimentScore = positiveCount > 0 || negativeCount > 0 ? 
      (positiveCount - negativeCount) / (positiveCount + negativeCount) : 0

    let overallSentiment: SentimentAnalysis['overall_sentiment']
    if (sentimentScore <= -0.6) overallSentiment = 'very_negative'
    else if (sentimentScore <= -0.2) overallSentiment = 'negative'
    else if (sentimentScore <= 0.2) overallSentiment = 'neutral'
    else if (sentimentScore <= 0.6) overallSentiment = 'positive'
    else overallSentiment = 'very_positive'

    return {
      overall_sentiment: overallSentiment,
      sentiment_score: sentimentScore,
      emotion_breakdown: {
        anger: negativeCount > 0 ? 0.5 : 0.1,
        fear: negativeCount > 0 ? 0.4 : 0.1,
        sadness: negativeCount > 0 ? 0.3 : 0.1,
        disgust: negativeCount > 0 ? 0.2 : 0.1,
        surprise: 0.2,
        joy: positiveCount > 0 ? 0.4 : 0.1,
        trust: positiveCount > 0 ? 0.3 : 0.2,
        anticipation: 0.3
      },
      topic_sentiment: [],
      temporal_sentiment: [],
      influence_metrics: {
        reach: 100,
        engagement: 50,
        amplification_factor: 1.0,
        key_influencers: []
      }
    }
  }

  private calculateUrgencyScore(
    sourceData: { source: MonitoringSource; content: any; metadata: Record<string, any> },
    config: MonitoringConfiguration
  ): number {
    let urgencyScore = 0.5 // Base score

    // Time-based urgency
    const now = new Date()
    const contentTime = sourceData.metadata.timestamp ? new Date(sourceData.metadata.timestamp) : now
    const hoursSinceContent = (now.getTime() - contentTime.getTime()) / (1000 * 60 * 60)
    
    // More urgent if content is recent
    if (hoursSinceContent < 1) urgencyScore += 0.3
    else if (hoursSinceContent < 6) urgencyScore += 0.2
    else if (hoursSinceContent < 24) urgencyScore += 0.1

    // Source-based urgency
    switch (sourceData.source) {
      case MonitoringSource.INTERNAL_SYSTEMS:
        urgencyScore += 0.4
        break
      case MonitoringSource.NEWS_FEEDS:
        urgencyScore += 0.3
        break
      case MonitoringSource.SOCIAL_MEDIA:
        urgencyScore += 0.2
        break
      case MonitoringSource.REGULATORY_FEEDS:
        urgencyScore += 0.5
        break
    }

    // Velocity-based urgency (if multiple similar items detected recently)
    // This would require historical analysis in production
    
    return Math.min(1.0, urgencyScore)
  }

  private calculateCredibilityScore(
    sourceData: { source: MonitoringSource; content: any; metadata: Record<string, any> }
  ): number {
    let credibilityScore = 0.5 // Base score

    // Source credibility
    switch (sourceData.source) {
      case MonitoringSource.REGULATORY_FEEDS:
        credibilityScore = 0.95
        break
      case MonitoringSource.NEWS_FEEDS:
        credibilityScore = 0.8
        break
      case MonitoringSource.INTERNAL_SYSTEMS:
        credibilityScore = 0.9
        break
      case MonitoringSource.SOCIAL_MEDIA:
        credibilityScore = 0.4
        break
      default:
        credibilityScore = 0.6
    }

    // Author credibility (if available)
    if (sourceData.metadata.author_verified) {
      credibilityScore += 0.1
    }

    // Publication credibility
    if (sourceData.metadata.publication_tier === 'tier1') {
      credibilityScore += 0.1
    }

    return Math.min(1.0, credibilityScore)
  }

  private calculateImpactPotential(
    keywordMatches: any,
    sentimentAnalysis: SentimentAnalysis,
    config: MonitoringConfiguration
  ): number {
    let impactScore = keywordMatches.relevance_score

    // Negative sentiment increases impact potential
    if (sentimentAnalysis.sentiment_score < 0) {
      impactScore += Math.abs(sentimentAnalysis.sentiment_score) * 0.3
    }

    // Category-specific adjustments
    switch (config.category) {
      case CrisisCategory.FINANCIAL:
      case CrisisCategory.REGULATORY:
        impactScore *= 1.2
        break
      case CrisisCategory.CYBERSECURITY:
      case CrisisCategory.LEGAL:
        impactScore *= 1.1
        break
    }

    return Math.min(1.0, impactScore)
  }

  private evaluateAlertCondition(
    condition: AlertCondition,
    scores: {
      relevance_score: number
      sentiment_score: number
      urgency_score: number
      credibility_score: number
      impact_potential: number
    }
  ): boolean {
    const metricValue = scores[condition.parameters.metric as keyof typeof scores]
    if (metricValue === undefined) return false

    switch (condition.parameters.operator) {
      case '>': return metricValue > condition.parameters.value
      case '<': return metricValue < condition.parameters.value
      case '>=': return metricValue >= condition.parameters.value
      case '<=': return metricValue <= condition.parameters.value
      case '==': return metricValue === condition.parameters.value
      case '!=': return metricValue !== condition.parameters.value
      default: return false
    }
  }

  private createAlert(
    config: MonitoringConfiguration,
    condition: AlertCondition,
    sourceData: any,
    keywordMatches: any,
    sentimentAnalysis: SentimentAnalysis,
    urgencyScore: number,
    credibilityScore: number,
    impactPotential: number
  ): SituationAlert {
    return {
      id: crypto.randomUUID(),
      configuration_id: config.id,
      alert_type: 'keyword_match', // Simplified
      severity: condition.severity,
      status: AlertStatus.ACTIVE,
      title: `${config.name}: ${keywordMatches.matched_keywords.join(', ')}`,
      description: `Alert triggered by keyword matches in ${sourceData.source}`,
      source_data: {
        source: sourceData.source,
        original_content: this.extractTextContent(sourceData.content),
        url: sourceData.metadata.url,
        publication_date: sourceData.metadata.timestamp,
        author: sourceData.metadata.author,
        social_metrics: sourceData.metadata.social_metrics
      },
      analysis: {
        relevance_score: keywordMatches.relevance_score,
        sentiment_score: sentimentAnalysis.sentiment_score,
        urgency_score: urgencyScore,
        credibility_score: credibilityScore,
        impact_potential: impactPotential,
        confidence_level: (keywordMatches.relevance_score + credibilityScore) / 2,
        key_entities: this.extractEntities(sourceData.content),
        topics: this.extractTopics(sourceData.content),
        risk_factors: this.identifyRiskFactors(sourceData.content, keywordMatches)
      },
      geographic_context: sourceData.metadata.location,
      temporal_context: {
        detected_at: new Date().toISOString(),
        content_timestamp: sourceData.metadata.timestamp,
        trending_duration: sourceData.metadata.trending_duration,
        peak_intensity: sourceData.metadata.peak_intensity
      },
      actions_taken: [],
      metadata: {
        configuration_name: config.name,
        keyword_matches: keywordMatches.matched_keywords,
        condition_triggered: condition.name
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * ALERT MANAGEMENT
   */

  async updateAlert(
    alertId: string,
    updates: z.infer<typeof UpdateAlertSchema>
  ): Promise<Result<SituationAlert>> {
    const validatedData = this.validateWithContext(updates, UpdateAlertSchema, 'update alert')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      // Create action record for status change
      let newAction: AlertAction | undefined
      if (validatedData.data.status) {
        newAction = {
          id: crypto.randomUUID(),
          action_type: this.getActionTypeForStatus(validatedData.data.status),
          description: `Status changed to ${validatedData.data.status}`,
          performed_by: user.data.id,
          performed_at: new Date().toISOString(),
          details: { previous_status: 'unknown' } // Would get from current alert
        }
      }

      // Get current alert to update actions
      const { data: currentAlert } = await this.supabase
        .from('situation_alerts')
        .select('actions_taken')
        .eq('id', alertId)
        .single()

      const updatedActions = newAction ? 
        [...(currentAlert?.actions_taken || []), newAction] : 
        currentAlert?.actions_taken || []

      const { data: alert, error } = await this.supabase
        .from('situation_alerts')
        .update({
          ...validatedData.data,
          actions_taken: updatedActions,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_situation_alert', 'situation_alert', alertId, {
        status: validatedData.data.status,
        assigned_to: validatedData.data.assigned_to
      })

      return alert as SituationAlert
    }, 'updateAlert')
  }

  async getActiveAlerts(
    filters?: {
      severity?: AlertSeverity[]
      source?: MonitoringSource[]
      category?: CrisisCategory[]
      status?: AlertStatus[]
      assigned_to?: string
      time_range?: { start: string; end: string }
    }
  ): Promise<Result<SituationAlert[]>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('situation_alerts')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.severity) {
        query = query.in('severity', filters.severity)
      }
      if (filters?.status) {
        query = query.in('status', filters.status)
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }
      if (filters?.time_range) {
        query = query.gte('created_at', filters.time_range.start)
                    .lte('created_at', filters.time_range.end)
      }

      const { data: alerts, error } = await query

      if (error) throw error

      // Filter by source and category if specified
      let filteredAlerts = alerts as SituationAlert[]
      
      if (filters?.source) {
        filteredAlerts = filteredAlerts.filter(alert => 
          filters.source!.includes(alert.source_data.source)
        )
      }

      return filteredAlerts
    }, 'getActiveAlerts')
  }

  /**
   * DASHBOARD MANAGEMENT
   */

  async createDashboard(
    dashboardData: Omit<MonitoringDashboard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<MonitoringDashboard>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const dashboard: MonitoringDashboard = {
        ...dashboardData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdDashboard, error } = await this.supabase
        .from('monitoring_dashboards')
        .insert(dashboard)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_monitoring_dashboard', 'monitoring_dashboard', dashboard.id)

      return createdDashboard as MonitoringDashboard
    }, 'createDashboard')
  }

  /**
   * ANALYTICS AND REPORTING
   */

  async generateTrendAnalysis(
    metric: string,
    timeRange: { start: string; end: string },
    source?: MonitoringSource
  ): Promise<Result<TrendAnalysis>> {
    return this.executeDbOperation(async () => {
      // This would implement actual trend analysis
      // For now, return a placeholder structure
      const trendAnalysis: TrendAnalysis = {
        metric,
        time_period: 'daily',
        data_points: [],
        trend_direction: 'stable',
        change_percentage: 0,
        statistical_significance: 0.95,
        anomalies: [],
        forecasts: []
      }

      return trendAnalysis
    }, 'generateTrendAnalysis')
  }

  async generateRiskIndicators(
    category?: CrisisCategory
  ): Promise<Result<RiskIndicator[]>> {
    return this.executeDbOperation(async () => {
      // Calculate risk indicators based on recent alerts and monitoring data
      const indicators: RiskIndicator[] = []

      const categories = category ? [category] : Object.values(CrisisCategory)

      for (const cat of categories) {
        const indicator = await this.calculateRiskIndicator(cat)
        indicators.push(indicator)
      }

      return indicators
    }, 'generateRiskIndicators')
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private extractTextContent(content: any): string {
    if (typeof content === 'string') return content
    if (content?.text) return content.text
    if (content?.body) return content.body
    if (content?.description) return content.description
    return JSON.stringify(content)
  }

  private extractEntities(content: any): string[] {
    // Simplified entity extraction - in production would use NLP service
    const text = this.extractTextContent(content)
    const words = text.split(/\W+/)
    
    // Look for capitalized words (potential entities)
    const entities = words
      .filter(word => word.length > 2 && word[0] === word[0].toUpperCase())
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, 10) // Limit to top 10

    return entities
  }

  private extractTopics(content: any): string[] {
    // Simplified topic extraction
    const text = this.extractTextContent(content).toLowerCase()
    const topics = []

    // Common business/crisis topics
    const topicKeywords = {
      'financial': ['revenue', 'profit', 'loss', 'market', 'stock'],
      'operational': ['system', 'service', 'outage', 'downtime', 'performance'],
      'legal': ['lawsuit', 'regulation', 'compliance', 'court', 'legal'],
      'reputation': ['brand', 'image', 'customer', 'public', 'perception']
    }

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic)
      }
    }

    return topics
  }

  private identifyRiskFactors(content: any, keywordMatches: any): string[] {
    const riskFactors = []
    const text = this.extractTextContent(content).toLowerCase()

    // Common risk indicators
    if (text.includes('lawsuit') || text.includes('legal action')) {
      riskFactors.push('legal_exposure')
    }
    if (text.includes('hack') || text.includes('breach') || text.includes('cyber')) {
      riskFactors.push('cybersecurity_threat')
    }
    if (text.includes('revenue') && (text.includes('decline') || text.includes('loss'))) {
      riskFactors.push('financial_impact')
    }
    if (text.includes('customer') && (text.includes('complaint') || text.includes('dissatisfied'))) {
      riskFactors.push('customer_satisfaction')
    }

    return riskFactors
  }

  private async startMonitoring(configurationId: string): Promise<void> {
    // This would start the actual monitoring process for the configuration
    // Could involve setting up webhooks, scheduled jobs, etc.
    console.log(`Starting monitoring for configuration ${configurationId}`)
  }

  private async restartMonitoring(configurationId: string): Promise<void> {
    // This would restart monitoring with updated configuration
    console.log(`Restarting monitoring for configuration ${configurationId}`)
  }

  private async processHighSeverityAlert(alert: SituationAlert): Promise<void> {
    // Send immediate notifications for critical/emergency alerts
    const notifications = [{
      type: 'crisis_alert',
      title: `${alert.severity.toUpperCase()}: ${alert.title}`,
      message: alert.description,
      priority: 'urgent',
      metadata: {
        alert_id: alert.id,
        severity: alert.severity,
        source: alert.source_data.source
      }
    }]

    // Get users who should be notified for high-severity alerts
    const { data: users } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .in('role', ['admin', 'executive', 'crisis_manager'])

    if (users) {
      const userNotifications = users.flatMap(user => 
        notifications.map(notif => ({ ...notif, user_id: user.user_id }))
      )
      
      await this.supabase.from('notifications').insert(userNotifications)
    }

    // Auto-escalate if configured
    const config = await this.supabase
      .from('monitoring_configurations')
      .select('alert_conditions')
      .eq('id', alert.configuration_id)
      .single()

    if (config.data) {
      const condition = config.data.alert_conditions.find((c: any) => c.severity === alert.severity)
      if (condition?.auto_escalate) {
        await this.escalateAlert(alert.id, condition.escalation_delay_minutes || 0)
      }
    }
  }

  private async escalateAlert(alertId: string, delayMinutes: number): Promise<void> {
    // Schedule or immediately escalate the alert
    if (delayMinutes > 0) {
      // In production, would use a job queue
      setTimeout(async () => {
        await this.performEscalation(alertId)
      }, delayMinutes * 60 * 1000)
    } else {
      await this.performEscalation(alertId)
    }
  }

  private async performEscalation(alertId: string): Promise<void> {
    // Escalate to higher management or external systems
    console.log(`Escalating alert ${alertId}`)
    
    await this.updateAlert(alertId, {
      status: AlertStatus.ESCALATED,
      escalated_to: 'executive_team'
    })
  }

  private getActionTypeForStatus(status: AlertStatus): AlertAction['action_type'] {
    switch (status) {
      case AlertStatus.ACKNOWLEDGED: return 'notification'
      case AlertStatus.INVESTIGATING: return 'investigation'
      case AlertStatus.ESCALATED: return 'escalation'
      case AlertStatus.RESOLVED: return 'response'
      default: return 'notification'
    }
  }

  private async calculateRiskIndicator(category: CrisisCategory): Promise<RiskIndicator> {
    // Calculate risk indicator for a category based on recent alerts
    const { data: recentAlerts } = await this.supabase
      .from('situation_alerts')
      .select('severity, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    let riskValue = 0
    if (recentAlerts) {
      // Weight alerts by severity
      const weights = {
        [AlertSeverity.INFO]: 0.1,
        [AlertSeverity.LOW]: 0.2,
        [AlertSeverity.MEDIUM]: 0.4,
        [AlertSeverity.HIGH]: 0.7,
        [AlertSeverity.CRITICAL]: 0.9,
        [AlertSeverity.EMERGENCY]: 1.0
      }

      riskValue = recentAlerts.reduce((sum, alert) => {
        return sum + (weights[alert.severity as AlertSeverity] || 0)
      }, 0) / Math.max(1, recentAlerts.length)
    }

    let currentLevel: CrisisLevel
    if (riskValue >= 0.8) currentLevel = CrisisLevel.CRITICAL
    else if (riskValue >= 0.6) currentLevel = CrisisLevel.HIGH
    else if (riskValue >= 0.4) currentLevel = CrisisLevel.MEDIUM
    else currentLevel = CrisisLevel.LOW

    return {
      id: crypto.randomUUID(),
      name: `${category} Risk Level`,
      category,
      current_level: currentLevel,
      threshold_levels: {
        low: 0.3,
        medium: 0.4,
        high: 0.6,
        critical: 0.8
      },
      current_value: riskValue,
      historical_average: 0.3, // Placeholder
      trend: riskValue > 0.4 ? 'deteriorating' : 'stable',
      components: [
        {
          component: 'Recent Alerts',
          weight: 0.6,
          value: riskValue,
          contribution: riskValue * 0.6
        },
        {
          component: 'Historical Pattern',
          weight: 0.4,
          value: 0.3,
          contribution: 0.3 * 0.4
        }
      ],
      last_updated: new Date().toISOString(),
      next_calculation: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    }
  }
}