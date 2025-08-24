/**
 * AI Model Management Service
 * 
 * Manages AI model configurations, performance monitoring, and provider integration
 * Handles model selection, load balancing, and cost optimization
 */

import { BaseService } from './base.service'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

import type {
  AIModelConfigId,
  MLPipelineId,
  MeetingTranscriptionId,
  OrganizationId,
  UserId
} from '../../types/branded'

import type {
  AIModelConfiguration,
  AIProvider,
  AICapability,
  ModelConfig,
  ModelPerformance,
  ModelUsage,
  ModelAccuracy
} from '../../types/ai-meeting-analysis'

// ==== Service Types ====

export interface CreateModelConfigRequest {
  readonly name: string
  readonly version: string
  readonly provider: AIProvider
  readonly capabilities: AICapability[]
  readonly config: ModelConfig
  readonly isActive?: boolean
  readonly isDefault?: boolean
}

export interface UpdateModelConfigRequest {
  readonly config?: Partial<ModelConfig>
  readonly isActive?: boolean
  readonly isDefault?: boolean
  readonly performanceMetrics?: Partial<ModelPerformance>
}

export interface ModelExecutionRequest {
  readonly modelId: AIModelConfigId
  readonly capability: AICapability
  readonly input: any
  readonly context?: Record<string, unknown>
  readonly priority?: 'low' | 'medium' | 'high' | 'critical'
}

export interface ModelExecutionResult {
  readonly output: any
  readonly confidence: number
  readonly processingTime: number
  readonly tokenUsage?: {
    readonly prompt: number
    readonly completion: number
    readonly total: number
  }
  readonly cost?: number
  readonly modelUsed: AIModelConfigId
}

export interface PipelineExecutionRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly pipelineName: string
  readonly pipelineVersion: string
  readonly stages: Array<{
    readonly name: string
    readonly capability: AICapability
    readonly input: any
    readonly dependencies?: string[]
  }>
  readonly config?: Record<string, unknown>
}

// ==== Main Service Class ====

export class AIModelManagementService extends BaseService {
  private modelConfigs: Map<AIModelConfigId, AIModelConfiguration> = new Map()
  private providerClients: Map<AIProvider, any> = new Map()
  private performanceMetrics: Map<AIModelConfigId, ModelPerformance> = new Map()

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.initializeProviders()
    this.loadModelConfigurations()
  }

  // ==== Model Configuration Management ====

  /**
   * Create new AI model configuration
   */
  async createModelConfig(
    request: CreateModelConfigRequest,
    createdBy: UserId
  ): Promise<Result<AIModelConfiguration>> {
    return this.executeDbOperation(async () => {
      // Validate provider support
      if (!this.isProviderSupported(request.provider)) {
        throw new Error(`Provider ${request.provider} is not supported`)
      }

      // Validate capabilities
      const invalidCapabilities = request.capabilities.filter(
        cap => !this.isCapabilitySupported(request.provider, cap)
      )

      if (invalidCapabilities.length > 0) {
        throw new Error(`Capabilities not supported: ${invalidCapabilities.join(', ')}`)
      }

      // Create configuration
      const configData = {
        name: request.name,
        version: request.version,
        provider: request.provider,
        capabilities: request.capabilities,
        config: request.config,
        performance_metrics: {
          accuracy: 0.0,
          latency: 0,
          throughput: 0,
          errorRate: 0.0,
          costPerRequest: 0.0,
          qualityScore: 0.0
        },
        usage_stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokensUsed: 0,
          totalCost: 0,
          lastUsed: null
        },
        is_active: request.isActive ?? true,
        is_default: request.isDefault ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_model_configurations')
        .insert(configData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create model configuration: ${error.message}`)
      }

      const config = this.mapDatabaseToModelConfig(data)
      this.modelConfigs.set(config.id, config)

      // Log activity
      await this.logActivity(
        'create_ai_model_config',
        'ai_model_configuration',
        config.id,
        {
          provider: request.provider,
          capabilities: request.capabilities
        }
      )

      return config
    }, 'createModelConfig')
  }

  /**
   * Update model configuration
   */
  async updateModelConfig(
    id: AIModelConfigId,
    updates: UpdateModelConfigRequest,
    updatedBy: UserId
  ): Promise<Result<AIModelConfiguration>> {
    return this.executeDbOperation(async () => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.config) {
        updateData.config = updates.config
      }

      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive
      }

      if (updates.isDefault !== undefined) {
        updateData.is_default = updates.isDefault

        // Ensure only one default model per provider-capability combination
        if (updates.isDefault) {
          const currentConfig = this.modelConfigs.get(id)
          if (currentConfig) {
            await this.supabase
              .from('ai_model_configurations')
              .update({ is_default: false })
              .eq('provider', currentConfig.provider)
              .neq('id', id)
          }
        }
      }

      if (updates.performanceMetrics) {
        updateData.performance_metrics = updates.performanceMetrics
      }

      const { data, error } = await this.supabase
        .from('ai_model_configurations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update model configuration: ${error.message}`)
      }

      const config = this.mapDatabaseToModelConfig(data)
      this.modelConfigs.set(config.id, config)

      return config
    }, 'updateModelConfig')
  }

  /**
   * Get all model configurations
   */
  async getModelConfigurations(
    provider?: AIProvider,
    capability?: AICapability,
    activeOnly = true
  ): Promise<Result<AIModelConfiguration[]>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('ai_model_configurations')
        .select()

      if (provider) {
        query = query.eq('provider', provider)
      }

      if (capability) {
        query = query.contains('capabilities', [capability])
      }

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get model configurations: ${error.message}`)
      }

      return data?.map(item => this.mapDatabaseToModelConfig(item)) || []
    }, 'getModelConfigurations')
  }

  // ==== Model Execution ====

  /**
   * Execute AI model with automatic provider selection
   */
  async executeModel(
    request: ModelExecutionRequest
  ): Promise<Result<ModelExecutionResult>> {
    return this.executeWithTimeoutAndRecovery(async () => {
      const startTime = Date.now()

      // Get model configuration
      const config = this.modelConfigs.get(request.modelId)
      if (!config) {
        throw new Error(`Model configuration not found: ${request.modelId}`)
      }

      // Validate capability
      if (!config.capabilities.includes(request.capability)) {
        throw new Error(`Model does not support capability: ${request.capability}`)
      }

      // Execute based on provider
      let result: any
      let tokenUsage: any = undefined
      
      try {
        switch (config.provider) {
          case 'openrouter':
            result = await this.executeOpenRouterModel(config, request)
            break
          case 'openai':
            result = await this.executeOpenAIModel(config, request)
            break
          case 'anthropic':
            result = await this.executeAnthropicModel(config, request)
            break
          default:
            throw new Error(`Provider not implemented: ${config.provider}`)
        }
      } catch (error) {
        // Update error metrics
        await this.updateModelMetrics(request.modelId, { failed: true })
        throw error
      }

      const processingTime = Date.now() - startTime

      // Update usage statistics
      await this.updateModelMetrics(request.modelId, {
        processingTime,
        tokenUsage,
        successful: true
      })

      return {
        output: result.output,
        confidence: result.confidence || 0.8,
        processingTime,
        tokenUsage,
        cost: result.cost,
        modelUsed: request.modelId
      }
    }, 30000, 'executeModel')
  }

  /**
   * Execute ML pipeline with multiple stages
   */
  async executePipeline(
    request: PipelineExecutionRequest
  ): Promise<Result<{
    results: Record<string, any>
    totalTime: number
    stages: Array<{
      name: string
      status: 'completed' | 'failed' | 'skipped'
      output?: any
      error?: string
      processingTime: number
    }>
  }>> {
    return this.executeDbOperation(async () => {
      const pipelineStartTime = Date.now()
      const stageResults: any[] = []
      const outputs: Record<string, any> = {}

      // Create pipeline execution record
      const { data: pipelineData, error: pipelineError } = await this.supabase
        .from('ai_ml_pipelines')
        .insert({
          transcription_id: request.transcriptionId,
          pipeline_name: request.pipelineName,
          pipeline_version: request.pipelineVersion,
          stage: 'initializing',
          status: 'running',
          input_data: { stages: request.stages.map(s => s.name) },
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (pipelineError) {
        throw new Error(`Failed to create pipeline record: ${pipelineError.message}`)
      }

      const pipelineId = pipelineData.id

      // Execute stages in dependency order
      const sortedStages = this.sortStagesByDependencies(request.stages)

      for (const stage of sortedStages) {
        const stageStartTime = Date.now()

        try {
          // Update pipeline status
          await this.supabase
            .from('ai_ml_pipelines')
            .update({
              stage: stage.name,
              updated_at: new Date().toISOString()
            })
            .eq('id', pipelineId)

          // Find appropriate model for capability
          const modelConfig = await this.selectBestModel(stage.capability)
          if (!modelConfig.success) {
            throw new Error(`No model available for capability: ${stage.capability}`)
          }

          // Execute stage
          const stageResult = await this.executeModel({
            modelId: modelConfig.data.id,
            capability: stage.capability,
            input: stage.input,
            context: request.config
          })

          if (!stageResult.success) {
            throw new Error(`Stage execution failed: ${stageResult.error.message}`)
          }

          const processingTime = Date.now() - stageStartTime
          outputs[stage.name] = stageResult.data.output

          stageResults.push({
            name: stage.name,
            status: 'completed',
            output: stageResult.data.output,
            processingTime
          })

        } catch (error) {
          const processingTime = Date.now() - stageStartTime

          stageResults.push({
            name: stage.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime
          })

          // Continue with remaining stages or fail pipeline based on criticality
          if (stage.name.includes('critical')) {
            break
          }
        }
      }

      const totalTime = Date.now() - pipelineStartTime

      // Update pipeline completion
      await this.supabase
        .from('ai_ml_pipelines')
        .update({
          status: 'completed',
          output_data: outputs,
          completed_at: new Date().toISOString(),
          processing_time: totalTime
        })
        .eq('id', pipelineId)

      return {
        results: outputs,
        totalTime,
        stages: stageResults
      }
    }, 'executePipeline')
  }

  // ==== Model Selection and Optimization ====

  /**
   * Select best model for capability based on performance metrics
   */
  async selectBestModel(
    capability: AICapability,
    criteria: {
      prioritizeSpeed?: boolean
      prioritizeAccuracy?: boolean
      maxCostPerRequest?: number
      providerPreference?: AIProvider[]
    } = {}
  ): Promise<Result<AIModelConfiguration>> {
    return this.executeDbOperation(async () => {
      const availableModels = Array.from(this.modelConfigs.values())
        .filter(model => 
          model.isActive && 
          model.capabilities.includes(capability)
        )

      if (availableModels.length === 0) {
        throw new Error(`No active models available for capability: ${capability}`)
      }

      // Apply cost filter
      let filteredModels = availableModels
      if (criteria.maxCostPerRequest) {
        filteredModels = availableModels.filter(
          model => model.performance.costPerRequest <= criteria.maxCostPerRequest!
        )
      }

      // Apply provider preference
      if (criteria.providerPreference && criteria.providerPreference.length > 0) {
        const preferredModels = filteredModels.filter(
          model => criteria.providerPreference!.includes(model.provider)
        )
        if (preferredModels.length > 0) {
          filteredModels = preferredModels
        }
      }

      // Select based on optimization criteria
      let selectedModel: AIModelConfiguration

      if (criteria.prioritizeSpeed) {
        // Select model with lowest latency
        selectedModel = filteredModels.reduce((best, current) =>
          current.performance.latency < best.performance.latency ? current : best
        )
      } else if (criteria.prioritizeAccuracy) {
        // Select model with highest accuracy
        selectedModel = filteredModels.reduce((best, current) =>
          current.performance.accuracy > best.performance.accuracy ? current : best
        )
      } else {
        // Select based on overall quality score
        selectedModel = filteredModels.reduce((best, current) =>
          current.performance.qualityScore > best.performance.qualityScore ? current : best
        )
      }

      return selectedModel
    }, 'selectBestModel')
  }

  // ==== Performance Monitoring ====

  /**
   * Get performance metrics for model
   */
  async getModelPerformance(
    id: AIModelConfigId,
    timeRange?: { start: string; end: string }
  ): Promise<Result<{
    current: ModelPerformance
    usage: ModelUsage
    trends: {
      accuracyTrend: 'improving' | 'declining' | 'stable'
      latencyTrend: 'improving' | 'declining' | 'stable'
      errorRateTrend: 'improving' | 'declining' | 'stable'
    }
    recommendations: string[]
  }>> {
    return this.executeDbOperation(async () => {
      const config = this.modelConfigs.get(id)
      if (!config) {
        throw new Error(`Model configuration not found: ${id}`)
      }

      // Get historical performance data from pipeline executions
      let query = this.supabase
        .from('ai_ml_pipelines')
        .select('processing_time, status, completed_at')
        .eq('model_config_id', id)

      if (timeRange) {
        query = query
          .gte('started_at', timeRange.start)
          .lte('started_at', timeRange.end)
      }

      const { data: executions, error } = await query

      if (error) {
        console.warn('Failed to get execution history:', error.message)
      }

      // Calculate trends
      const trends = this.calculatePerformanceTrends(executions || [])

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(config, trends)

      return {
        current: config.performance,
        usage: config.usage,
        trends,
        recommendations
      }
    }, 'getModelPerformance')
  }

  // ==== Private Helper Methods ====

  private async initializeProviders(): Promise<void> {
    // Initialize API clients for different providers
    // This would set up authentication and configuration for each provider
  }

  private async loadModelConfigurations(): Promise<void> {
    try {
      const result = await this.getModelConfigurations()
      if (result.success) {
        result.data.forEach(config => {
          this.modelConfigs.set(config.id, config)
        })
      }
    } catch (error) {
      console.error('Failed to load model configurations:', error)
    }
  }

  private isProviderSupported(provider: AIProvider): boolean {
    const supportedProviders: AIProvider[] = [
      'openai', 'anthropic', 'openrouter', 'google', 'huggingface'
    ]
    return supportedProviders.includes(provider)
  }

  private isCapabilitySupported(provider: AIProvider, capability: AICapability): boolean {
    const providerCapabilities: Record<AIProvider, AICapability[]> = {
      openai: ['transcription', 'sentiment-analysis', 'topic-extraction', 'meeting-summarization'],
      anthropic: ['sentiment-analysis', 'topic-extraction', 'meeting-summarization', 'decision-tracking'],
      google: ['transcription', 'sentiment-analysis'],
      openrouter: ['sentiment-analysis', 'topic-extraction', 'meeting-summarization', 'predictive-analysis'],
      huggingface: ['sentiment-analysis', 'topic-extraction'],
      'azure-openai': ['transcription', 'sentiment-analysis', 'meeting-summarization'],
      'aws-bedrock': ['sentiment-analysis', 'topic-extraction']
    }

    return providerCapabilities[provider]?.includes(capability) || false
  }

  private async executeOpenRouterModel(
    config: AIModelConfiguration,
    request: ModelExecutionRequest
  ): Promise<any> {
    const apiKey = process.env['OPENROUTER_API_KEY']
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
      },
      body: JSON.stringify({
        model: this.getProviderModelName(config),
        messages: [{ role: 'user', content: JSON.stringify(request.input) }],
        max_tokens: config.config.maxTokens,
        temperature: config.config.temperature
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      output: data.choices?.[0]?.message?.content || '',
      confidence: 0.8,
      cost: data.usage?.total_tokens * 0.0001 // Approximate cost
    }
  }

  private async executeOpenAIModel(
    config: AIModelConfiguration,
    request: ModelExecutionRequest
  ): Promise<any> {
    // Placeholder for OpenAI direct integration
    throw new Error('OpenAI direct integration not implemented')
  }

  private async executeAnthropicModel(
    config: AIModelConfiguration,
    request: ModelExecutionRequest
  ): Promise<any> {
    // Placeholder for Anthropic direct integration
    throw new Error('Anthropic direct integration not implemented')
  }

  private getProviderModelName(config: AIModelConfiguration): string {
    // Map internal model names to provider-specific names
    const modelMappings: Record<string, Record<string, string>> = {
      openrouter: {
        'claude-3-5-sonnet': 'anthropic/claude-3-5-sonnet',
        'gpt-4-turbo': 'openai/gpt-4-turbo',
        'whisper-large-v3': 'openai/whisper-large-v3'
      }
    }

    return modelMappings[config.provider]?.[config.name] || config.name
  }

  private async updateModelMetrics(
    modelId: AIModelConfigId,
    metrics: {
      processingTime?: number
      tokenUsage?: any
      successful?: boolean
      failed?: boolean
    }
  ): Promise<void> {
    try {
      const config = this.modelConfigs.get(modelId)
      if (!config) return

      const updates: any = {}

      if (metrics.successful) {
        updates.successful_requests = config.usage.successfulRequests + 1
        updates.last_used = new Date().toISOString()
      }

      if (metrics.failed) {
        updates.failed_requests = config.usage.failedRequests + 1
      }

      if (metrics.processingTime) {
        // Update average latency
        const totalRequests = config.usage.totalRequests + 1
        const newLatency = (config.performance.latency * config.usage.totalRequests + metrics.processingTime) / totalRequests
        updates.performance_metrics = {
          ...config.performance,
          latency: Math.round(newLatency)
        }
      }

      updates.total_requests = config.usage.totalRequests + 1

      await this.supabase
        .from('ai_model_configurations')
        .update({
          usage_stats: { ...config.usage, ...updates },
          ...(updates.performance_metrics && { performance_metrics: updates.performance_metrics })
        })
        .eq('id', modelId)

    } catch (error) {
      console.error('Failed to update model metrics:', error)
    }
  }

  private sortStagesByDependencies(stages: any[]): any[] {
    // Simple topological sort based on dependencies
    const sorted: any[] = []
    const visited = new Set<string>()

    const visit = (stageName: string) => {
      if (visited.has(stageName)) return

      const stage = stages.find(s => s.name === stageName)
      if (!stage) return

      // Visit dependencies first
      if (stage.dependencies) {
        stage.dependencies.forEach((dep: string) => visit(dep))
      }

      visited.add(stageName)
      sorted.push(stage)
    }

    stages.forEach(stage => visit(stage.name))
    return sorted
  }

  private calculatePerformanceTrends(executions: any[]): {
    accuracyTrend: 'improving' | 'declining' | 'stable'
    latencyTrend: 'improving' | 'declining' | 'stable'
    errorRateTrend: 'improving' | 'declining' | 'stable'
  } {
    // Simplified trend calculation
    return {
      accuracyTrend: 'stable',
      latencyTrend: 'stable',
      errorRateTrend: 'stable'
    }
  }

  private generatePerformanceRecommendations(
    config: AIModelConfiguration,
    trends: any
  ): string[] {
    const recommendations: string[] = []

    if (config.performance.latency > 5000) {
      recommendations.push('Consider switching to a faster model for better user experience')
    }

    if (config.performance.errorRate > 0.05) {
      recommendations.push('High error rate detected - review model configuration')
    }

    if (config.performance.costPerRequest > 0.05) {
      recommendations.push('Consider optimizing prompts to reduce token usage and costs')
    }

    return recommendations
  }

  private mapDatabaseToModelConfig(data: any): AIModelConfiguration {
    return {
      id: data.id,
      name: data.name,
      version: data.version,
      provider: data.provider,
      capabilities: data.capabilities,
      config: data.config,
      performance: data.performance_metrics,
      usage: data.usage_stats,
      lastUpdated: data.updated_at
    }
  }
}