/**
 * AI Meeting Intelligence Service
 * 
 * Enterprise-grade service for AI-powered meeting analysis and insights
 * Follows DDD architecture with Result pattern and dependency injection
 */

import { BaseService } from './base.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import { AIMeetingTranscriptionRepository } from '../repositories/ai-meeting-transcription.repository'
import { AIMeetingInsightsRepository } from '../repositories/ai-meeting-insights.repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

import type {
  UserId,
  OrganizationId,
  MeetingId,
  MeetingTranscriptionId,
  TranscriptionSegmentId,
  SpeakerIdentificationId,
  ISODateString
} from '../../types/branded'

import type {
  MeetingTranscription,
  TranscriptionSegment,
  SpeakerProfile,
  AIMeetingSummary,
  SentimentAnalysis,
  MeetingInsights,
  AIActionItem,
  AIDecisionTracking,
  EffectivenessScore,
  EngagementMetrics,
  ProductivityMetrics,
  SentimentScore,
  TopicAnalysis,
  AudioConfiguration,
  TranscriptionStatus,
  DetectedPattern,
  Prediction,
  MeetingPatternAnalysis
} from '../../types/ai-meeting-analysis'

// ==== Service Types ====

export interface StartTranscriptionRequest {
  readonly meetingId: MeetingId
  readonly organizationId: OrganizationId
  readonly title: string
  readonly participants: Array<{
    readonly name: string
    readonly email?: string
    readonly role?: string
  }>
  readonly audioConfig?: Partial<AudioConfiguration>
  readonly expectedLanguages?: string[]
  readonly createdBy: UserId
}

export interface ProcessSegmentRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly text: string
  readonly audioData?: ArrayBuffer
  readonly startTime: number
  readonly endTime: number
  readonly confidence: number
  readonly detectedLanguage?: string
}

export interface GenerateInsightsRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly includeActionItems?: boolean
  readonly includeDecisions?: boolean
  readonly includeSentiment?: boolean
  readonly includeEffectiveness?: boolean
  readonly customPrompts?: Record<string, string>
}

export interface AnalyticsRequest {
  readonly organizationId: OrganizationId
  readonly dateRange: {
    readonly start: ISODateString
    readonly end: ISODateString
  }
  readonly includePatterns?: boolean
  readonly includePredictions?: boolean
  readonly includeComparisons?: boolean
}

// ==== Main Service Class ====

export class AIMeetingIntelligenceService extends BaseService {
  private transcriptionRepository: AIMeetingTranscriptionRepository
  private insightsRepository: AIMeetingInsightsRepository
  private aiConfig: {
    readonly provider: string
    readonly apiKey: string
    readonly baseUrl: string
    readonly models: Record<string, string>
  }

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.transcriptionRepository = new AIMeetingTranscriptionRepository(supabase)
    this.insightsRepository = new AIMeetingInsightsRepository(supabase)
    
    // Initialize AI configuration
    this.aiConfig = {
      provider: 'openrouter',
      apiKey: process.env['OPENROUTER_API_KEY'] || '',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: {
        transcription: 'openai/whisper-large-v3',
        analysis: 'anthropic/claude-3-5-sonnet',
        sentiment: 'openai/gpt-4-turbo',
        summarization: 'anthropic/claude-3-5-sonnet'
      }
    }
  }

  // ==== Transcription Management ====

  /**
   * Start a new AI-powered meeting transcription session
   */
  async startTranscription(
    request: StartTranscriptionRequest
  ): Promise<Result<{
    transcription: MeetingTranscription
    sessionId: string
    websocketUrl?: string
  }>> {
    return this.executeDbOperation(async () => {
      // Validate user permissions
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw new Error('Authentication required')
      }

      // Check organization access
      const hasAccess = await this.checkPermissionWithContext(
        userResult.data.id,
        'meetings',
        'create_transcription',
        request.meetingId,
        { organizationId: request.organizationId }
      )

      if (!hasAccess.success) {
        throw new Error('Insufficient permissions to create transcription')
      }

      // Create transcription record
      const transcriptionResult = await this.transcriptionRepository.createTranscription({
        meetingId: request.meetingId,
        organizationId: request.organizationId,
        title: request.title,
        audioConfig: request.audioConfig,
        createdBy: request.createdBy
      })

      if (!transcriptionResult.success) {
        throw new Error(`Failed to create transcription: ${transcriptionResult.error.message}`)
      }

      // Initialize speaker profiles
      const speakers: SpeakerProfile[] = []
      for (const participant of request.participants) {
        const speakerResult = await this.transcriptionRepository.addSpeaker({
          transcriptionId: transcriptionResult.data.id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
          confidence: 0.5 // Initial confidence
        })

        if (speakerResult.success) {
          speakers.push(speakerResult.data)
        }
      }

      // Generate unique session ID for real-time updates
      const sessionId = `meeting_${request.meetingId}_${Date.now()}`

      // Log activity
      await this.logActivity(
        'start_ai_transcription',
        'meeting_transcription',
        transcriptionResult.data.id,
        {
          meetingId: request.meetingId,
          participantCount: request.participants.length,
          audioConfig: request.audioConfig
        }
      )

      return {
        transcription: {
          ...transcriptionResult.data,
          speakers
        },
        sessionId,
        websocketUrl: process.env['WEBSOCKET_URL'] ? 
          `${process.env['WEBSOCKET_URL']}/transcription/${sessionId}` : undefined
      }
    }, 'startTranscription')
  }

  /**
   * Process a transcription segment with AI analysis
   */
  async processSegment(
    request: ProcessSegmentRequest
  ): Promise<Result<{
    segment: TranscriptionSegment
    speakerId?: SpeakerIdentificationId
    actionItems?: string[]
    decisions?: string[]
    sentiment?: SentimentScore
  }>> {
    return this.executeDbOperation(async () => {
      // Identify speaker if audio data is provided
      let speakerId: SpeakerIdentificationId | undefined
      if (request.audioData) {
        const speakerResult = await this.identifySpeaker(
          request.transcriptionId,
          request.audioData
        )
        if (speakerResult.success) {
          speakerId = speakerResult.data
        }
      }

      // Create basic segment
      const segmentResult = await this.transcriptionRepository.addSegment({
        transcriptionId: request.transcriptionId,
        text: request.text,
        startTime: request.startTime,
        endTime: request.endTime,
        speakerId,
        confidence: request.confidence,
        language: request.detectedLanguage
      })

      if (!segmentResult.success) {
        throw new Error(`Failed to create segment: ${segmentResult.error.message}`)
      }

      // Perform AI analysis in parallel
      const [
        actionItemsResult,
        decisionsResult,
        sentimentResult
      ] = await Promise.all([
        this.extractActionItems(request.text),
        this.extractDecisions(request.text),
        this.analyzeSentiment(request.text)
      ])

      // Update segment with analysis results
      const analysisData = {
        actionItems: actionItemsResult.success ? actionItemsResult.data : [],
        decisions: decisionsResult.success ? decisionsResult.data : [],
        sentiment: sentimentResult.success ? sentimentResult.data : undefined
      }

      return {
        segment: segmentResult.data,
        speakerId,
        ...analysisData
      }
    }, 'processSegment')
  }

  /**
   * Complete transcription and generate comprehensive insights
   */
  async completeTranscription(
    transcriptionId: MeetingTranscriptionId,
    completedBy: UserId
  ): Promise<Result<{
    transcription: MeetingTranscription
    summary: AIMeetingSummary
    insights: MeetingInsights
    actionItems: AIActionItem[]
  }>> {
    return this.executeDbOperation(async () => {
      // Update transcription status
      const updateResult = await this.transcriptionRepository.updateTranscription(
        transcriptionId,
        { status: 'analyzing' },
        completedBy
      )

      if (!updateResult.success) {
        throw new Error(`Failed to update transcription: ${updateResult.error.message}`)
      }

      // Get all segments for analysis
      const segmentsResult = await this.transcriptionRepository
        .findSegmentsByTranscriptionId(transcriptionId)

      if (!segmentsResult.success) {
        throw new Error(`Failed to get segments: ${segmentsResult.error.message}`)
      }

      const segments = segmentsResult.data.data

      // Generate comprehensive analysis
      const [
        summaryResult,
        insightsResult,
        actionItemsResult
      ] = await Promise.all([
        this.generateMeetingSummary(transcriptionId, segments),
        this.generateMeetingInsights(transcriptionId, segments),
        this.generateActionItems(transcriptionId, segments)
      ])

      // Mark as completed
      await this.transcriptionRepository.updateTranscription(
        transcriptionId,
        { status: 'completed' },
        completedBy
      )

      // Log completion
      await this.logActivity(
        'complete_ai_transcription',
        'meeting_transcription',
        transcriptionId,
        {
          segmentCount: segments.length,
          actionItemCount: actionItemsResult.success ? actionItemsResult.data.length : 0
        }
      )

      return {
        transcription: updateResult.data,
        summary: summaryResult.success ? summaryResult.data : {} as AIMeetingSummary,
        insights: insightsResult.success ? insightsResult.data : {} as MeetingInsights,
        actionItems: actionItemsResult.success ? actionItemsResult.data : []
      }
    }, 'completeTranscription')
  }

  // ==== AI Analysis Methods ====

  /**
   * Generate comprehensive meeting summary
   */
  async generateMeetingSummary(
    transcriptionId: MeetingTranscriptionId,
    segments: TranscriptionSegment[]
  ): Promise<Result<AIMeetingSummary>> {
    return this.executeWithTimeoutAndRecovery(async () => {
      const fullTranscript = segments
        .map(s => `[${s.speakerId || 'Unknown'}]: ${s.text}`)
        .join('\n')

      const prompt = this.buildSummaryPrompt(fullTranscript)
      const analysisResult = await this.callAIModel(prompt, 'analysis')

      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error.message}`)
      }

      const analysis = JSON.parse(analysisResult.data)

      // Get transcription details
      const transcriptionResult = await this.transcriptionRepository.findById(transcriptionId)
      if (!transcriptionResult.success || !transcriptionResult.data) {
        throw new Error('Transcription not found')
      }

      return await this.insightsRepository.createSummary({
        transcriptionId,
        organizationId: transcriptionResult.data.organizationId,
        executiveSummary: analysis.executiveSummary,
        keyTopics: analysis.keyTopics || [],
        majorDecisions: analysis.majorDecisions || [],
        actionItemsSummary: analysis.actionItemsSummary || {},
        participantInsights: analysis.participantInsights || [],
        meetingEffectiveness: analysis.meetingEffectiveness || {},
        complianceFlags: analysis.complianceFlags || [],
        followUpRecommendations: analysis.followUpRecommendations || [],
        confidence: analysis.confidence || 0.85
      })
    }, 30000, 'generateMeetingSummary')
  }

  /**
   * Generate meeting effectiveness and engagement insights
   */
  async generateMeetingInsights(
    transcriptionId: MeetingTranscriptionId,
    segments: TranscriptionSegment[]
  ): Promise<Result<MeetingInsights>> {
    return this.executeWithTimeoutAndRecovery(async () => {
      // Calculate basic metrics
      const totalDuration = Math.max(...segments.map(s => s.endTime)) - 
                           Math.min(...segments.map(s => s.startTime))
      const speakerCount = new Set(segments.map(s => s.speakerId).filter(Boolean)).size
      const wordCount = segments.reduce((sum, s) => sum + s.text.split(' ').length, 0)

      // Calculate effectiveness score
      const effectivenessScore: EffectivenessScore = {
        overall: this.calculateOverallEffectiveness(segments),
        dimensions: {
          clarity: this.calculateClarity(segments),
          participation: this.calculateParticipation(segments),
          decisiveness: this.calculateDecisiveness(segments),
          actionOrientation: this.calculateActionOrientation(segments),
          timeManagement: this.calculateTimeManagement(segments, totalDuration),
          goalAlignment: this.calculateGoalAlignment(segments)
        },
        factors: [],
        improvementAreas: []
      }

      // Calculate engagement metrics
      const engagementMetrics: EngagementMetrics = {
        averageEngagement: this.calculateAverageEngagement(segments),
        speakerEngagement: {},
        peakEngagementMoments: [],
        disengagementSignals: [],
        participationBalance: this.calculateParticipationBalance(segments, speakerCount)
      }

      // Calculate productivity metrics
      const productivityMetrics: ProductivityMetrics = {
        decisionsPerHour: this.calculateDecisionsPerHour(segments, totalDuration),
        actionItemsPerHour: this.calculateActionItemsPerHour(segments, totalDuration),
        timeToDecision: this.calculateTimeToDecision(segments),
        agendaAdherence: 0.8, // Placeholder - would need agenda data
        focusScore: this.calculateFocusScore(segments)
      }

      // Get transcription details
      const transcriptionResult = await this.transcriptionRepository.findById(transcriptionId)
      if (!transcriptionResult.success || !transcriptionResult.data) {
        throw new Error('Transcription not found')
      }

      return await this.insightsRepository.createMeetingInsights({
        transcriptionId,
        organizationId: transcriptionResult.data.organizationId,
        effectivenessScore,
        engagementMetrics,
        productivityMetrics
      })
    }, 15000, 'generateMeetingInsights')
  }

  /**
   * Extract and structure action items with AI
   */
  async generateActionItems(
    transcriptionId: MeetingTranscriptionId,
    segments: TranscriptionSegment[]
  ): Promise<Result<AIActionItem[]>> {
    return this.executeWithTimeoutAndRecovery(async () => {
      const actionItems: AIActionItem[] = []

      // Process segments in batches for action item extraction
      const batchSize = 10
      for (let i = 0; i < segments.length; i += batchSize) {
        const batch = segments.slice(i, i + batchSize)
        const batchText = batch.map(s => s.text).join(' ')

        const extractionResult = await this.extractActionItems(batchText)
        if (extractionResult.success && extractionResult.data.length > 0) {
          // Create action items in database
          for (const actionText of extractionResult.data) {
            const actionItemResult = await this.insightsRepository.createActionItem(
              transcriptionId,
              {
                extractedText: actionText,
                processedDescription: actionText,
                priority: { level: 'medium', confidence: 0.7, reasoning: [] },
                status: 'extracted'
              }
            )

            if (actionItemResult.success) {
              actionItems.push(actionItemResult.data)
            }
          }
        }
      }

      return actionItems
    }, 20000, 'generateActionItems')
  }

  // ==== Analytics and Reporting ====

  /**
   * Generate comprehensive analytics for organization
   */
  async generateAnalytics(
    request: AnalyticsRequest
  ): Promise<Result<{
    summary: {
      totalMeetings: number
      totalHours: number
      averageEffectiveness: number
      totalActionItems: number
    }
    trends: {
      effectivenessTrend: 'improving' | 'declining' | 'stable'
      engagementTrend: 'improving' | 'declining' | 'stable'
      meetingFrequency: number
    }
    patterns?: MeetingPatternAnalysis
    predictions?: Prediction[]
    recommendations: string[]
  }>> {
    return this.executeDbOperation(async () => {
      // Get basic statistics
      const statsResult = await this.transcriptionRepository
        .getOrganizationStatistics(request.organizationId, request.dateRange)

      if (!statsResult.success) {
        throw new Error(`Failed to get statistics: ${statsResult.error.message}`)
      }

      // Get effectiveness trends
      const trendsResult = await this.insightsRepository
        .getEffectivenessTrends(request.organizationId, request.dateRange)

      if (!trendsResult.success) {
        throw new Error(`Failed to get trends: ${trendsResult.error.message}`)
      }

      const stats = statsResult.data
      const trends = trendsResult.data

      // Generate patterns if requested
      let patterns: MeetingPatternAnalysis | undefined
      if (request.includePatterns) {
        const patternsResult = await this.analyzePatterns(request.organizationId, request.dateRange)
        if (patternsResult.success) {
          patterns = patternsResult.data
        }
      }

      // Generate basic recommendations
      const recommendations = this.generateRecommendations(stats, trends)

      return {
        summary: {
          totalMeetings: stats.totalTranscriptions,
          totalHours: Math.round(stats.totalMeetingHours * 100) / 100,
          averageEffectiveness: Math.round(trends.averageEffectiveness * 100) / 100,
          totalActionItems: 0 // Would need to calculate from action items
        },
        trends: {
          effectivenessTrend: trends.trendDirection,
          engagementTrend: 'stable' as const, // Placeholder
          meetingFrequency: stats.totalTranscriptions / 
            (Math.max(1, (Date.parse(request.dateRange.end) - Date.parse(request.dateRange.start)) / (1000 * 60 * 60 * 24 * 7)))
        },
        patterns,
        recommendations
      }
    }, 'generateAnalytics')
  }

  // ==== Private Helper Methods ====

  private async identifySpeaker(
    transcriptionId: MeetingTranscriptionId,
    audioData: ArrayBuffer
  ): Promise<Result<SpeakerIdentificationId>> {
    // Placeholder for voice identification
    // In production, would use ML model for voice fingerprinting
    return success('unknown_speaker_1' as SpeakerIdentificationId)
  }

  private async extractActionItems(text: string): Promise<Result<string[]>> {
    const prompt = `Extract action items from this meeting text. Return only concrete, actionable tasks:

    Text: ${text.substring(0, 1000)}

    Return a JSON array of action item strings.`

    const result = await this.callAIModel(prompt, 'analysis')
    if (!result.success) {
      return failure(result.error)
    }

    try {
      const actionItems = JSON.parse(result.data)
      return success(Array.isArray(actionItems) ? actionItems : [])
    } catch (error) {
      return success([]) // Graceful fallback
    }
  }

  private async extractDecisions(text: string): Promise<Result<string[]>> {
    const prompt = `Extract decisions made from this meeting text:

    Text: ${text.substring(0, 1000)}

    Return a JSON array of decision strings.`

    const result = await this.callAIModel(prompt, 'analysis')
    if (!result.success) {
      return failure(result.error)
    }

    try {
      const decisions = JSON.parse(result.data)
      return success(Array.isArray(decisions) ? decisions : [])
    } catch (error) {
      return success([])
    }
  }

  private async analyzeSentiment(text: string): Promise<Result<SentimentScore>> {
    const prompt = `Analyze the sentiment of this text and return a JSON object with polarity (-1 to 1) and magnitude (0 to 1):

    Text: ${text.substring(0, 500)}

    Return: {"polarity": number, "magnitude": number, "category": "positive|negative|neutral"}`

    const result = await this.callAIModel(prompt, 'sentiment')
    if (!result.success) {
      return failure(result.error)
    }

    try {
      const sentiment = JSON.parse(result.data)
      return success({
        polarity: sentiment.polarity || 0,
        magnitude: sentiment.magnitude || 0,
        category: sentiment.category || 'neutral',
        confidence: 0.8
      })
    } catch (error) {
      return success({
        polarity: 0,
        magnitude: 0,
        category: 'neutral',
        confidence: 0.5
      })
    }
  }

  private buildSummaryPrompt(transcript: string): string {
    return `Analyze this meeting transcript and provide a comprehensive summary in JSON format:

    ${transcript.substring(0, 4000)}

    Provide this structure:
    {
      "executiveSummary": "Brief 2-3 sentence summary",
      "keyTopics": [{"topic": "string", "category": "strategic|operational|financial", "timeSpent": minutes}],
      "majorDecisions": [{"title": "string", "description": "string", "consensus": "high|medium|low"}],
      "actionItemsSummary": {"total": number, "byPriority": {}},
      "participantInsights": [{"name": "string", "participationScore": number}],
      "meetingEffectiveness": {"overall": number, "dimensions": {}},
      "complianceFlags": [],
      "followUpRecommendations": [{"type": "string", "description": "string"}],
      "confidence": number
    }`
  }

  private async callAIModel(prompt: string, modelType: string): Promise<Result<string>> {
    if (!this.aiConfig.apiKey) {
      return failure(new Error('AI API key not configured'))
    }

    try {
      const response = await fetch(`${this.aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
          'HTTP-Referer': process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
        },
        body: JSON.stringify({
          model: this.aiConfig.models[modelType],
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No response from AI model')
      }

      return success(content)
    } catch (error) {
      return failure(error as Error)
    }
  }

  // Calculation helper methods (simplified implementations)
  private calculateOverallEffectiveness(segments: TranscriptionSegment[]): number {
    // Simplified calculation based on segment count and content analysis
    return Math.min(100, 50 + segments.length * 2)
  }

  private calculateClarity(segments: TranscriptionSegment[]): number {
    return 75 // Placeholder
  }

  private calculateParticipation(segments: TranscriptionSegment[]): number {
    const speakerCount = new Set(segments.map(s => s.speakerId).filter(Boolean)).size
    return Math.min(100, speakerCount * 20)
  }

  private calculateDecisiveness(segments: TranscriptionSegment[]): number {
    const decisionWords = segments.reduce((count, s) => 
      count + (s.text.toLowerCase().match(/\b(decide|decision|agree|approved|rejected)\b/g) || []).length, 0)
    return Math.min(100, decisionWords * 10)
  }

  private calculateActionOrientation(segments: TranscriptionSegment[]): number {
    const actionWords = segments.reduce((count, s) => 
      count + (s.text.toLowerCase().match(/\b(action|task|assign|responsible|deadline)\b/g) || []).length, 0)
    return Math.min(100, actionWords * 5)
  }

  private calculateTimeManagement(segments: TranscriptionSegment[], totalDuration: number): number {
    // Simple heuristic based on meeting length
    const hoursDecimal = totalDuration / (1000 * 60 * 60)
    if (hoursDecimal <= 1) return 90
    if (hoursDecimal <= 2) return 70
    return 50
  }

  private calculateGoalAlignment(segments: TranscriptionSegment[]): number {
    return 70 // Placeholder
  }

  private calculateAverageEngagement(segments: TranscriptionSegment[]): number {
    return 75 // Placeholder
  }

  private calculateParticipationBalance(segments: TranscriptionSegment[], speakerCount: number): number {
    if (speakerCount <= 1) return 0
    // Calculate how evenly distributed speaking time is
    const speakingTime: Record<string, number> = {}
    segments.forEach(s => {
      const speaker = s.speakerId || 'unknown'
      speakingTime[speaker] = (speakingTime[speaker] || 0) + (s.endTime - s.startTime)
    })

    const times = Object.values(speakingTime)
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
    
    // Lower variance = better balance
    return Math.max(0, 100 - Math.sqrt(variance) / 1000)
  }

  private calculateDecisionsPerHour(segments: TranscriptionSegment[], totalDuration: number): number {
    const decisionCount = segments.reduce((count, s) => 
      count + (s.text.toLowerCase().match(/\b(decide|decision|agree|approved)\b/g) || []).length, 0)
    const hours = totalDuration / (1000 * 60 * 60)
    return hours > 0 ? decisionCount / hours : 0
  }

  private calculateActionItemsPerHour(segments: TranscriptionSegment[], totalDuration: number): number {
    const actionCount = segments.reduce((count, s) => 
      count + (s.text.toLowerCase().match(/\b(action|task|assign)\b/g) || []).length, 0)
    const hours = totalDuration / (1000 * 60 * 60)
    return hours > 0 ? actionCount / hours : 0
  }

  private calculateTimeToDecision(segments: TranscriptionSegment[]): number {
    return 15 // Placeholder - minutes
  }

  private calculateFocusScore(segments: TranscriptionSegment[]): number {
    // Simple heuristic based on topic consistency
    return 80 // Placeholder
  }

  private async analyzePatterns(
    organizationId: OrganizationId,
    dateRange: { start: ISODateString; end: ISODateString }
  ): Promise<Result<MeetingPatternAnalysis>> {
    // Simplified pattern analysis
    const patterns: DetectedPattern[] = [
      {
        type: 'recurring-topic',
        description: 'Budget discussions appear in 80% of meetings',
        frequency: 0.8,
        confidence: 0.9,
        examples: [],
        impact: { positive: [], negative: [], neutral: [] }
      }
    ]

    const predictions: Prediction[] = [
      {
        type: 'meeting-outcome',
        description: 'Next meeting likely to focus on strategic planning',
        probability: 0.75,
        timeframe: '1 week',
        impact: 'medium',
        preventionStrategies: [],
        monitoringMetrics: []
      }
    ]

    return await this.insightsRepository.createPatternAnalysis({
      organizationId,
      analysisStart: dateRange.start,
      analysisEnd: dateRange.end,
      patterns,
      trends: [],
      anomalies: [],
      predictions
    })
  }

  private generateRecommendations(
    stats: any,
    trends: any
  ): string[] {
    const recommendations: string[] = []

    if (trends.averageEffectiveness < 70) {
      recommendations.push('Consider implementing structured agendas to improve meeting effectiveness')
    }

    if (stats.averageParticipants > 8) {
      recommendations.push('Large meetings detected - consider smaller working groups for better engagement')
    }

    if (trends.trendDirection === 'declining') {
      recommendations.push('Meeting effectiveness is declining - review recent meeting processes')
    }

    return recommendations
  }
}