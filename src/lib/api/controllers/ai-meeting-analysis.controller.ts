/**
 * AI Meeting Analysis API Controller
 * 
 * Consolidated controller for all AI-powered meeting analysis endpoints
 * Handles transcription, insights generation, and analytics with OpenAPI documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BaseController } from '../base-controller'
import { Result, Ok, Err, ResultUtils } from '../../result'
import { AIMeetingIntelligenceService } from '../../services/ai-meeting-intelligence.service'
import { AIModelManagementService } from '../../services/ai-model-management.service'
import { createSupabaseServerClient } from '../../supabase-server'

import type {
  MeetingTranscriptionId,
  OrganizationId,
  MeetingId,
  UserId
} from '../../../types/branded'

// ==== Request/Response Schemas ====

const StartTranscriptionSchema = z.object({
  meetingId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(255),
  participants: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    role: z.string().optional()
  })),
  audioConfig: z.object({
    sampleRate: z.number().min(8000).max(48000).optional(),
    channels: z.number().min(1).max(2).optional(),
    format: z.enum(['wav', 'mp3', 'flac', 'webm']).optional(),
    noiseReduction: z.boolean().optional()
  }).optional(),
  expectedLanguages: z.array(z.string()).optional()
})

const ProcessSegmentSchema = z.object({
  transcriptionId: z.string().uuid(),
  text: z.string().min(1),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  confidence: z.number().min(0).max(1),
  detectedLanguage: z.string().optional()
})

const GenerateInsightsSchema = z.object({
  transcriptionId: z.string().uuid(),
  includeActionItems: z.boolean().optional().default(true),
  includeDecisions: z.boolean().optional().default(true),
  includeSentiment: z.boolean().optional().default(true),
  includeEffectiveness: z.boolean().optional().default(true),
  customPrompts: z.record(z.string()).optional()
})

const AnalyticsRequestSchema = z.object({
  organizationId: z.string().uuid(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  includePatterns: z.boolean().optional().default(false),
  includePredictions: z.boolean().optional().default(false),
  includeComparisons: z.boolean().optional().default(false)
})

const ModelExecutionSchema = z.object({
  capability: z.enum(['transcription', 'sentiment-analysis', 'topic-extraction', 'action-item-extraction', 'decision-tracking', 'meeting-summarization', 'predictive-analysis']),
  input: z.any(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  context: z.record(z.any()).optional()
})

// ==== Main Controller Class ====

export class AIMeetingAnalysisController extends BaseController {
  private intelligenceService: AIMeetingIntelligenceService
  private modelService: AIModelManagementService

  constructor() {
    super()
    // Services will be initialized per request to ensure fresh Supabase client
    this.intelligenceService = null as any
    this.modelService = null as any
  }

  private async initializeServices(request: NextRequest): Promise<void> {
    const supabase = await createSupabaseServerClient()
    this.intelligenceService = new AIMeetingIntelligenceService(supabase)
    this.modelService = new AIModelManagementService(supabase)
  }

  // ==== Transcription Endpoints ====

  /**
   * POST /api/ai-meeting/transcription/start
   * Start a new AI-powered meeting transcription session
   */
  async startTranscription(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const bodyResult = await this.validateBody(request, StartTranscriptionSchema)
    
    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const requestData = ResultUtils.unwrap(bodyResult)
      const userId = ResultUtils.unwrap(userIdResult) as UserId

      const result = await this.intelligenceService.startTranscription({
        meetingId: requestData.meetingId as MeetingId,
        organizationId: requestData.organizationId as OrganizationId,
        title: requestData.title,
        participants: requestData.participants,
        audioConfig: requestData.audioConfig,
        expectedLanguages: requestData.expectedLanguages,
        createdBy: userId
      })

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: {
          transcriptionId: result.data.transcription.id,
          sessionId: result.data.sessionId,
          websocketUrl: result.data.websocketUrl,
          status: result.data.transcription.status,
          participants: result.data.transcription.speakers
        },
        message: 'Meeting transcription started successfully'
      })
    })
  }

  /**
   * POST /api/ai-meeting/transcription/segment
   * Process a new transcription segment with AI analysis
   */
  async processSegment(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const bodyResult = await this.validateBody(request, ProcessSegmentSchema)
    
    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const requestData = ResultUtils.unwrap(bodyResult)

      const result = await this.intelligenceService.processSegment({
        transcriptionId: requestData.transcriptionId as MeetingTranscriptionId,
        text: requestData.text,
        startTime: requestData.startTime,
        endTime: requestData.endTime,
        confidence: requestData.confidence,
        detectedLanguage: requestData.detectedLanguage
      })

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: {
          segmentId: result.data.segment.id,
          speakerId: result.data.speakerId,
          actionItems: result.data.actionItems || [],
          decisions: result.data.decisions || [],
          sentiment: result.data.sentiment,
          processing: result.data.segment.processing
        },
        message: 'Segment processed successfully'
      })
    })
  }

  /**
   * POST /api/ai-meeting/transcription/[id]/complete
   * Complete transcription and generate comprehensive insights
   */
  async completeTranscription(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeServices(request)

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const transcriptionId = context.params.id as MeetingTranscriptionId
      const userId = ResultUtils.unwrap(userIdResult) as UserId

      const result = await this.intelligenceService.completeTranscription(
        transcriptionId,
        userId
      )

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: {
          transcription: result.data.transcription,
          summary: result.data.summary,
          insights: {
            effectiveness: result.data.insights.effectivenessScore,
            engagement: result.data.insights.engagementMetrics,
            productivity: result.data.insights.productivityMetrics
          },
          actionItems: result.data.actionItems.map(item => ({
            id: item.id,
            description: item.processedDescription,
            assignee: item.assignee?.name,
            priority: item.priority.level,
            status: item.status,
            dueDate: item.dueDate?.date
          }))
        },
        message: 'Meeting analysis completed successfully'
      })
    })
  }

  /**
   * GET /api/ai-meeting/transcription/[id]
   * Get transcription details with analysis results
   */
  async getTranscription(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeServices(request)

    const queryResult = this.validateQuery(request, z.object({
      includeSegments: z.boolean().optional().default(false),
      includeAnalysis: z.boolean().optional().default(true)
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const transcriptionId = context.params.id as MeetingTranscriptionId
      const { includeSegments, includeAnalysis } = ResultUtils.unwrap(queryResult)

      // Get basic transcription
      const transcriptionResult = await this.intelligenceService.transcriptionRepository
        .findById(transcriptionId)

      if (!transcriptionResult.success || !transcriptionResult.data) {
        return Err(new Error('Transcription not found'))
      }

      const response: any = {
        transcription: transcriptionResult.data
      }

      // Include segments if requested
      if (includeSegments) {
        const segmentsResult = await this.intelligenceService.transcriptionRepository
          .findSegmentsByTranscriptionId(transcriptionId)

        if (segmentsResult.success) {
          response.segments = segmentsResult.data.data
        }
      }

      // Include analysis if requested
      if (includeAnalysis) {
        const summaryResult = await this.intelligenceService.insightsRepository
          .findSummaryByTranscriptionId(transcriptionId)

        if (summaryResult.success && summaryResult.data) {
          response.summary = summaryResult.data
        }

        const insightsResult = await this.intelligenceService.insightsRepository
          .findMeetingInsightsByTranscriptionId(transcriptionId)

        if (insightsResult.success && insightsResult.data) {
          response.insights = insightsResult.data
        }
      }

      return Ok({
        success: true,
        data: response,
        message: 'Transcription retrieved successfully'
      })
    })
  }

  // ==== Insights and Analytics Endpoints ====

  /**
   * POST /api/ai-meeting/insights/generate
   * Generate AI insights for a completed transcription
   */
  async generateInsights(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const bodyResult = await this.validateBody(request, GenerateInsightsSchema)
    
    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const requestData = ResultUtils.unwrap(bodyResult)
      
      // Get segments for analysis
      const segmentsResult = await this.intelligenceService.transcriptionRepository
        .findSegmentsByTranscriptionId(requestData.transcriptionId as MeetingTranscriptionId)

      if (!segmentsResult.success) {
        return Err(new Error('Failed to get transcription segments'))
      }

      const segments = segmentsResult.data.data

      // Generate insights based on request
      const results: any = {}

      if (requestData.includeActionItems) {
        const actionItemsResult = await this.intelligenceService
          .generateActionItems(requestData.transcriptionId as MeetingTranscriptionId, segments)

        if (actionItemsResult.success) {
          results.actionItems = actionItemsResult.data
        }
      }

      if (requestData.includeSentiment) {
        // Generate sentiment analysis for all segments
        const sentimentResults = await Promise.all(
          segments.slice(0, 10).map(segment => // Limit to avoid rate limits
            this.intelligenceService['analyzeSentiment'](segment.text)
          )
        )

        const overallSentiment = sentimentResults
          .filter(result => result.success)
          .map(result => result.data)

        results.sentiment = {
          overall: this.calculateAverageSentiment(overallSentiment),
          segments: overallSentiment
        }
      }

      if (requestData.includeEffectiveness || requestData.includeDecisions) {
        const summaryResult = await this.intelligenceService
          .generateMeetingSummary(requestData.transcriptionId as MeetingTranscriptionId, segments)

        if (summaryResult.success) {
          results.summary = summaryResult.data
        }

        const insightsResult = await this.intelligenceService
          .generateMeetingInsights(requestData.transcriptionId as MeetingTranscriptionId, segments)

        if (insightsResult.success) {
          results.effectiveness = insightsResult.data.effectivenessScore
          results.engagement = insightsResult.data.engagementMetrics
        }
      }

      return Ok({
        success: true,
        data: results,
        message: 'Insights generated successfully'
      })
    })
  }

  /**
   * POST /api/ai-meeting/analytics/organization
   * Generate comprehensive analytics for an organization
   */
  async generateOrganizationAnalytics(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const bodyResult = await this.validateBody(request, AnalyticsRequestSchema)
    
    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const requestData = ResultUtils.unwrap(bodyResult)

      const result = await this.intelligenceService.generateAnalytics({
        organizationId: requestData.organizationId as OrganizationId,
        dateRange: {
          start: requestData.dateRange.start as any,
          end: requestData.dateRange.end as any
        },
        includePatterns: requestData.includePatterns,
        includePredictions: requestData.includePredictions,
        includeComparisons: requestData.includeComparisons
      })

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Analytics generated successfully'
      })
    })
  }

  /**
   * GET /api/ai-meeting/analytics/effectiveness/[organizationId]
   * Get effectiveness trends for an organization
   */
  async getEffectivenessTrends(
    request: NextRequest,
    context: { params: { organizationId: string } }
  ): Promise<NextResponse> {
    await this.initializeServices(request)

    const queryResult = this.validateQuery(request, z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly')
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const organizationId = context.params.organizationId as OrganizationId
      const { startDate, endDate } = ResultUtils.unwrap(queryResult)

      const result = await this.intelligenceService.insightsRepository
        .getEffectivenessTrends(organizationId, {
          start: startDate as any,
          end: endDate as any
        })

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Effectiveness trends retrieved successfully'
      })
    })
  }

  // ==== AI Model Management Endpoints ====

  /**
   * POST /api/ai-meeting/models/execute
   * Execute an AI model for a specific capability
   */
  async executeModel(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const bodyResult = await this.validateBody(request, ModelExecutionSchema)
    
    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const requestData = ResultUtils.unwrap(bodyResult)

      // Select best model for capability
      const modelResult = await this.modelService.selectBestModel(
        requestData.capability,
        {
          prioritizeSpeed: requestData.priority === 'critical',
          prioritizeAccuracy: requestData.priority === 'low'
        }
      )

      if (!modelResult.success) {
        return Err(new Error(`No model available: ${modelResult.error.message}`))
      }

      // Execute model
      const executionResult = await this.modelService.executeModel({
        modelId: modelResult.data.id,
        capability: requestData.capability,
        input: requestData.input,
        context: requestData.context,
        priority: requestData.priority
      })

      if (!executionResult.success) {
        return Err(new Error(executionResult.error.message))
      }

      return Ok({
        success: true,
        data: {
          output: executionResult.data.output,
          confidence: executionResult.data.confidence,
          processingTime: executionResult.data.processingTime,
          modelUsed: executionResult.data.modelUsed,
          cost: executionResult.data.cost
        },
        message: 'Model executed successfully'
      })
    })
  }

  /**
   * GET /api/ai-meeting/models/configurations
   * Get available AI model configurations
   */
  async getModelConfigurations(request: NextRequest): Promise<NextResponse> {
    await this.initializeServices(request)

    const queryResult = this.validateQuery(request, z.object({
      provider: z.enum(['openai', 'anthropic', 'google', 'huggingface', 'openrouter', 'azure-openai', 'aws-bedrock']).optional(),
      capability: z.enum(['transcription', 'sentiment-analysis', 'topic-extraction', 'action-item-extraction', 'decision-tracking', 'meeting-summarization', 'predictive-analysis']).optional(),
      activeOnly: z.boolean().optional().default(true)
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const { provider, capability, activeOnly } = ResultUtils.unwrap(queryResult)

      const result = await this.modelService.getModelConfigurations(
        provider,
        capability,
        activeOnly
      )

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data.map(config => ({
          id: config.id,
          name: config.name,
          provider: config.provider,
          capabilities: config.capabilities,
          performance: config.performance,
          isDefault: config.isDefault,
          isActive: config.isActive
        })),
        message: 'Model configurations retrieved successfully'
      })
    })
  }

  /**
   * GET /api/ai-meeting/models/[id]/performance
   * Get performance metrics for a specific model
   */
  async getModelPerformance(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeServices(request)

    const queryResult = this.validateQuery(request, z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const modelId = context.params.id as any
      const { startDate, endDate } = ResultUtils.unwrap(queryResult)

      const timeRange = startDate && endDate ? {
        start: startDate,
        end: endDate
      } : undefined

      const result = await this.modelService.getModelPerformance(modelId, timeRange)

      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Model performance retrieved successfully'
      })
    })
  }

  // ==== Private Helper Methods ====

  private calculateAverageSentiment(sentiments: any[]): any {
    if (sentiments.length === 0) {
      return {
        polarity: 0,
        magnitude: 0,
        category: 'neutral',
        confidence: 0
      }
    }

    const avgPolarity = sentiments.reduce((sum, s) => sum + s.polarity, 0) / sentiments.length
    const avgMagnitude = sentiments.reduce((sum, s) => sum + s.magnitude, 0) / sentiments.length
    const avgConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length

    let category = 'neutral'
    if (avgPolarity > 0.2) category = 'positive'
    else if (avgPolarity < -0.2) category = 'negative'

    return {
      polarity: Math.round(avgPolarity * 100) / 100,
      magnitude: Math.round(avgMagnitude * 100) / 100,
      category,
      confidence: Math.round(avgConfidence * 100) / 100
    }
  }
}