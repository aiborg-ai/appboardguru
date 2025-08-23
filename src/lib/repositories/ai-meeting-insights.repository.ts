/**
 * AI Meeting Insights Repository
 * 
 * Repository for managing meeting insights, analytics, and AI-powered analysis
 * Handles sentiment analysis, effectiveness scoring, and predictive insights
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { BaseRepository } from './base.repository'
import { Result, success, failure, wrapAsync } from './result'
import type { 
  QueryOptions, 
  PaginatedResult,
  AuditLogEntry,
  UserId,
  OrganizationId
} from './types'

import type {
  MeetingTranscriptionId,
  MeetingInsightId,
  SentimentAnalysisId,
  MeetingPatternId,
  SmartAgendaId,
  FollowUpRecommendationId,
  ISODateString
} from '../../types/branded'

import type {
  AIMeetingSummary,
  SentimentAnalysis,
  MeetingInsights,
  MeetingPatternAnalysis,
  EffectivenessScore,
  EngagementMetrics,
  ProductivityMetrics,
  SentimentScore,
  AIActionItem,
  AIDecisionTracking,
  DetectedPattern,
  Prediction,
  TopicAnalysis
} from '../../types/ai-meeting-analysis'

// ==== Repository Types ====

export interface CreateSummaryRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly organizationId: OrganizationId
  readonly executiveSummary: string
  readonly keyTopics: TopicAnalysis[]
  readonly majorDecisions: any[]
  readonly actionItemsSummary: any
  readonly participantInsights: any[]
  readonly meetingEffectiveness: EffectivenessScore
  readonly complianceFlags: any[]
  readonly followUpRecommendations: any[]
  readonly confidence: number
}

export interface CreateSentimentAnalysisRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly overallSentiment: SentimentScore
  readonly speakerSentiments: Record<string, any>
  readonly topicSentiments: Record<string, SentimentScore>
  readonly sentimentEvolution: any[]
}

export interface CreateMeetingInsightsRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly organizationId: OrganizationId
  readonly effectivenessScore: EffectivenessScore
  readonly engagementMetrics: EngagementMetrics
  readonly productivityMetrics: ProductivityMetrics
}

export interface CreatePatternAnalysisRequest {
  readonly organizationId: OrganizationId
  readonly analysisStart: ISODateString
  readonly analysisEnd: ISODateString
  readonly patterns: DetectedPattern[]
  readonly trends: any[]
  readonly anomalies: any[]
  readonly predictions: Prediction[]
}

export interface InsightsFilters {
  readonly organizationId?: OrganizationId
  readonly transcriptionId?: MeetingTranscriptionId
  readonly dateRange?: {
    readonly start: ISODateString
    readonly end: ISODateString
  }
  readonly effectivenessRange?: {
    readonly min: number
    readonly max: number
  }
}

// ==== Main Repository Class ====

export class AIMeetingInsightsRepository extends BaseRepository {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  protected getEntityName(): string {
    return 'AI Meeting Insights'
  }

  protected getSearchFields(): string[] {
    return ['executive_summary']
  }

  protected getTableName(): string {
    return 'ai_meeting_insights'
  }

  // ==== Meeting Summary Operations ====

  /**
   * Create AI meeting summary
   */
  async createSummary(
    request: CreateSummaryRequest
  ): Promise<Result<AIMeetingSummary>> {
    return wrapAsync(async () => {
      const summaryData = {
        transcription_id: request.transcriptionId,
        organization_id: request.organizationId,
        executive_summary: request.executiveSummary,
        key_topics: request.keyTopics,
        major_decisions: request.majorDecisions,
        action_items_summary: request.actionItemsSummary,
        participant_insights: request.participantInsights,
        meeting_effectiveness: request.meetingEffectiveness,
        compliance_flags: request.complianceFlags,
        follow_up_recommendations: request.followUpRecommendations,
        confidence: request.confidence,
        model_info: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          version: '20241022',
          confidence: request.confidence
        },
        generated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_meeting_summaries')
        .insert(summaryData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create summary: ${error.message}`)
      }

      return this.mapDatabaseToSummary(data)
    })
  }

  /**
   * Find summary by transcription ID
   */
  async findSummaryByTranscriptionId(
    transcriptionId: MeetingTranscriptionId
  ): Promise<Result<AIMeetingSummary | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_meeting_summaries')
        .select()
        .eq('transcription_id', transcriptionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to find summary: ${error.message}`)
      }

      return this.mapDatabaseToSummary(data)
    })
  }

  // ==== Sentiment Analysis Operations ====

  /**
   * Create sentiment analysis
   */
  async createSentimentAnalysis(
    request: CreateSentimentAnalysisRequest
  ): Promise<Result<SentimentAnalysis>> {
    return wrapAsync(async () => {
      const sentimentData = {
        transcription_id: request.transcriptionId,
        overall_sentiment: request.overallSentiment,
        speaker_sentiments: request.speakerSentiments,
        topic_sentiments: request.topicSentiments,
        sentiment_evolution: request.sentimentEvolution,
        analyzed_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_sentiment_analysis')
        .insert(sentimentData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create sentiment analysis: ${error.message}`)
      }

      return this.mapDatabaseToSentimentAnalysis(data)
    })
  }

  /**
   * Find sentiment analysis by transcription ID
   */
  async findSentimentAnalysisByTranscriptionId(
    transcriptionId: MeetingTranscriptionId
  ): Promise<Result<SentimentAnalysis | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_sentiment_analysis')
        .select()
        .eq('transcription_id', transcriptionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to find sentiment analysis: ${error.message}`)
      }

      return this.mapDatabaseToSentimentAnalysis(data)
    })
  }

  // ==== Meeting Insights Operations ====

  /**
   * Create meeting insights
   */
  async createMeetingInsights(
    request: CreateMeetingInsightsRequest
  ): Promise<Result<MeetingInsights>> {
    return wrapAsync(async () => {
      const insightsData = {
        transcription_id: request.transcriptionId,
        organization_id: request.organizationId,
        effectiveness_score: request.effectivenessScore,
        engagement_metrics: request.engagementMetrics,
        productivity_metrics: request.productivityMetrics,
        communication_patterns: [],
        improvement_recommendations: [],
        benchmark_comparison: {},
        trend_analysis: {},
        predictive_insights: [],
        generated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_meeting_insights')
        .insert(insightsData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create meeting insights: ${error.message}`)
      }

      return this.mapDatabaseToMeetingInsights(data)
    })
  }

  /**
   * Find meeting insights by transcription ID
   */
  async findMeetingInsightsByTranscriptionId(
    transcriptionId: MeetingTranscriptionId
  ): Promise<Result<MeetingInsights | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_meeting_insights')
        .select()
        .eq('transcription_id', transcriptionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to find meeting insights: ${error.message}`)
      }

      return this.mapDatabaseToMeetingInsights(data)
    })
  }

  /**
   * Find meeting insights with filters
   */
  async findMeetingInsights(
    filters?: InsightsFilters,
    options?: QueryOptions
  ): Promise<Result<PaginatedResult<MeetingInsights>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('ai_meeting_insights')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId)
      }

      if (filters?.transcriptionId) {
        query = query.eq('transcription_id', filters.transcriptionId)
      }

      if (filters?.dateRange) {
        query = query
          .gte('generated_at', filters.dateRange.start)
          .lte('generated_at', filters.dateRange.end)
      }

      if (filters?.effectivenessRange) {
        query = query
          .gte('effectiveness_score->>overall', filters.effectivenessRange.min)
          .lte('effectiveness_score->>overall', filters.effectivenessRange.max)
      }

      // Apply query options
      query = this.applyQueryOptions(query, options || {})

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to find meeting insights: ${error.message}`)
      }

      const insights = data?.map(item => this.mapDatabaseToMeetingInsights(item)) || []

      return this.createPaginatedResult(
        insights,
        count,
        options || {}
      ).data
    })
  }

  // ==== Pattern Analysis Operations ====

  /**
   * Create pattern analysis
   */
  async createPatternAnalysis(
    request: CreatePatternAnalysisRequest
  ): Promise<Result<MeetingPatternAnalysis>> {
    return wrapAsync(async () => {
      const patternData = {
        organization_id: request.organizationId,
        analysis_start: request.analysisStart,
        analysis_end: request.analysisEnd,
        patterns: request.patterns,
        trends: request.trends,
        anomalies: request.anomalies,
        predictions: request.predictions,
        recommended_actions: [],
        model_accuracy: {
          overall: 0.85,
          byCapability: {},
          confidenceIntervals: {}
        },
        analyzed_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_meeting_patterns')
        .insert(patternData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create pattern analysis: ${error.message}`)
      }

      return this.mapDatabaseToPatternAnalysis(data)
    })
  }

  /**
   * Find pattern analysis for organization
   */
  async findPatternAnalysisForOrganization(
    organizationId: OrganizationId,
    dateRange?: { start: ISODateString; end: ISODateString }
  ): Promise<Result<MeetingPatternAnalysis[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('ai_meeting_patterns')
        .select()
        .eq('organization_id', organizationId)
        .order('analyzed_at', { ascending: false })

      if (dateRange) {
        query = query
          .gte('analysis_start', dateRange.start)
          .lte('analysis_end', dateRange.end)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to find pattern analysis: ${error.message}`)
      }

      return data?.map(item => this.mapDatabaseToPatternAnalysis(item)) || []
    })
  }

  // ==== Action Items Operations ====

  /**
   * Create AI action item
   */
  async createActionItem(
    transcriptionId: MeetingTranscriptionId,
    actionItem: Partial<AIActionItem>
  ): Promise<Result<AIActionItem>> {
    return wrapAsync(async () => {
      const actionItemData = {
        transcription_id: transcriptionId,
        extracted_text: actionItem.extractedText || '',
        processed_description: actionItem.processedDescription || '',
        assignee_speaker_id: actionItem.assignee?.speakerId,
        assignee_user_id: actionItem.assignee?.userId,
        assignee_name: actionItem.assignee?.name,
        assignment_confidence: actionItem.assignee?.confidence,
        due_date: actionItem.dueDate?.date,
        due_date_confidence: actionItem.dueDate?.confidence,
        due_date_source: actionItem.dueDate?.source,
        priority: actionItem.priority?.level || 'medium',
        priority_confidence: actionItem.priority?.confidence,
        priority_reasoning: actionItem.priority?.reasoning,
        complexity_score: actionItem.complexity || {},
        category: actionItem.category,
        dependencies: actionItem.dependencies,
        estimated_hours: actionItem.estimatedHours,
        risk_factors: actionItem.riskFactors,
        compliance_relevant: actionItem.complianceRelevant || false,
        status: actionItem.status || 'extracted',
        extracted_at: new Date().toISOString(),
        last_analyzed: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_action_items')
        .insert(actionItemData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create action item: ${error.message}`)
      }

      return this.mapDatabaseToActionItem(data)
    })
  }

  /**
   * Find action items by transcription ID
   */
  async findActionItemsByTranscriptionId(
    transcriptionId: MeetingTranscriptionId
  ): Promise<Result<AIActionItem[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_action_items')
        .select()
        .eq('transcription_id', transcriptionId)
        .order('extracted_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to find action items: ${error.message}`)
      }

      return data?.map(item => this.mapDatabaseToActionItem(item)) || []
    })
  }

  // ==== Analytics and Reporting ====

  /**
   * Get effectiveness trends for organization
   */
  async getEffectivenessTrends(
    organizationId: OrganizationId,
    dateRange: { start: ISODateString; end: ISODateString }
  ): Promise<Result<{
    averageEffectiveness: number
    trendDirection: 'improving' | 'declining' | 'stable'
    dataPoints: Array<{
      date: ISODateString
      effectiveness: number
      meetingCount: number
    }>
  }>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_meeting_insights')
        .select('generated_at, effectiveness_score')
        .eq('organization_id', organizationId)
        .gte('generated_at', dateRange.start)
        .lte('generated_at', dateRange.end)
        .order('generated_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to get effectiveness trends: ${error.message}`)
      }

      if (!data || data.length === 0) {
        return {
          averageEffectiveness: 0,
          trendDirection: 'stable' as const,
          dataPoints: []
        }
      }

      // Group by date and calculate averages
      const dailyData = data.reduce((acc, item) => {
        const date = item.generated_at.split('T')[0]
        const effectiveness = item.effectiveness_score?.overall || 0

        if (!acc[date]) {
          acc[date] = { total: 0, count: 0 }
        }
        acc[date].total += effectiveness
        acc[date].count += 1

        return acc
      }, {} as Record<string, { total: number; count: number }>)

      const dataPoints = Object.entries(dailyData).map(([date, data]) => ({
        date: date as ISODateString,
        effectiveness: data.total / data.count,
        meetingCount: data.count
      }))

      const averageEffectiveness = dataPoints.length > 0 ?
        dataPoints.reduce((sum, point) => sum + point.effectiveness, 0) / dataPoints.length : 0

      // Calculate trend direction
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
      if (dataPoints.length >= 2) {
        const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))
        const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))

        const firstAvg = firstHalf.reduce((sum, p) => sum + p.effectiveness, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((sum, p) => sum + p.effectiveness, 0) / secondHalf.length

        const difference = secondAvg - firstAvg
        if (Math.abs(difference) > 2) { // 2 point threshold
          trendDirection = difference > 0 ? 'improving' : 'declining'
        }
      }

      return {
        averageEffectiveness,
        trendDirection,
        dataPoints
      }
    })
  }

  // ==== Private Helper Methods ====

  private mapDatabaseToSummary(data: any): AIMeetingSummary {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      organizationId: data.organization_id,
      executiveSummary: data.executive_summary,
      keyTopics: data.key_topics || [],
      majorDecisions: data.major_decisions || [],
      actionItemsSummary: data.action_items_summary || {},
      participantInsights: data.participant_insights || [],
      meetingEffectiveness: data.meeting_effectiveness || {},
      complianceFlags: data.compliance_flags || [],
      followUpRecommendations: data.follow_up_recommendations || [],
      generatedAt: data.generated_at,
      model: data.model_info || {},
      confidence: data.confidence || 0.5
    }
  }

  private mapDatabaseToSentimentAnalysis(data: any): SentimentAnalysis {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      overallSentiment: data.overall_sentiment,
      speakerSentiments: data.speaker_sentiments || {},
      topicSentiments: data.topic_sentiments || {},
      sentimentEvolution: data.sentiment_evolution || [],
      emotionalHighlights: data.emotional_highlights || [],
      conflictDetection: data.conflict_detection || [],
      engagementIndicators: data.engagement_indicators || [],
      analyzedAt: data.analyzed_at
    }
  }

  private mapDatabaseToMeetingInsights(data: any): MeetingInsights {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      organizationId: data.organization_id,
      effectivenessScore: data.effectiveness_score || {},
      engagementMetrics: data.engagement_metrics || {},
      productivityMetrics: data.productivity_metrics || {},
      communicationPatterns: data.communication_patterns || [],
      improvementRecommendations: data.improvement_recommendations || [],
      benchmarkComparison: data.benchmark_comparison || {},
      trendAnalysis: data.trend_analysis || {},
      predictiveInsights: data.predictive_insights || [],
      generatedAt: data.generated_at
    }
  }

  private mapDatabaseToPatternAnalysis(data: any): MeetingPatternAnalysis {
    return {
      id: data.id,
      organizationId: data.organization_id,
      analysisWindow: {
        start: data.analysis_start,
        end: data.analysis_end
      },
      patterns: data.patterns || [],
      trends: data.trends || [],
      anomalies: data.anomalies || [],
      predictions: data.predictions || [],
      recommendedActions: data.recommended_actions || [],
      modelAccuracy: data.model_accuracy || {},
      analyzedAt: data.analyzed_at
    }
  }

  private mapDatabaseToActionItem(data: any): AIActionItem {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      extractedText: data.extracted_text,
      processedDescription: data.processed_description,
      assignee: data.assignee_speaker_id ? {
        speakerId: data.assignee_speaker_id,
        userId: data.assignee_user_id,
        name: data.assignee_name,
        confidence: data.assignment_confidence
      } : undefined,
      dueDate: data.due_date ? {
        date: data.due_date,
        confidence: data.due_date_confidence,
        source: data.due_date_source
      } : undefined,
      priority: {
        level: data.priority,
        confidence: data.priority_confidence,
        reasoning: data.priority_reasoning || []
      },
      category: data.category,
      complexity: data.complexity_score || {},
      dependencies: data.dependencies || [],
      estimatedHours: data.estimated_hours,
      riskFactors: data.risk_factors || [],
      complianceRelevant: data.compliance_relevant,
      status: data.status,
      extractedAt: data.extracted_at,
      lastAnalyzed: data.last_analyzed
    }
  }
}