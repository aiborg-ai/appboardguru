/**
 * BoardGuru Default LLM Provider
 * Uses company's managed OpenRouter API with usage tracking and quotas
 */

import { BaseProvider } from './BaseProvider';
import {
  ILLMMessage,
  ILLMOptions,
  ILLMResponse,
  ILLMStreamResponse,
  ILLMModel
} from '../interfaces/ILLMProvider';

interface BoardGuruConfig {
  organizationId: string;
  endpoint?: string;
  apiKey?: string;
  maxRequestsPerMinute?: number;
  maxTokensPerHour?: number;
  defaultModel?: string;
}

export class BoardGuruProvider extends BaseProvider {
  readonly name = 'BoardGuru';
  readonly type = 'boardguru' as const;
  readonly priority = 100; // Highest priority as default provider
  
  private apiKey: string;
  private endpoint: string;
  private organizationId: string;
  private requestCount: Map<string, number> = new Map();
  private tokenCount: Map<string, number> = new Map();
  
  constructor(config: BoardGuruConfig) {
    super(config);
    this.organizationId = config.organizationId;
    this.endpoint = config.endpoint || 'https://openrouter.ai/api/v1';
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
  }
  
  async initialize(config: BoardGuruConfig): Promise<void> {
    await super.initialize(config);
    
    if (!this.apiKey) {
      throw new Error('BoardGuru provider requires an API key');
    }
    
    // Reset rate limiting counters
    this.startRateLimitResetTimer();
  }
  
  async chat(messages: ILLMMessage[], options?: ILLMOptions): Promise<ILLMResponse> {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized');
    }
    
    // Check rate limits
    await this.checkRateLimits();
    
    const model = options?.model || this.getDefaultModel();
    const startTime = Date.now();
    
    try {
      const response = await this.retryWithBackoff(async () => {
        const res = await fetch(`${this.endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://appboardguru.com',
            'X-Title': 'AppBoardGuru Enterprise'
          },
          body: JSON.stringify({
            model,
            messages: this.formatMessages(messages),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2000,
            top_p: options?.topP ?? 1,
            frequency_penalty: options?.frequencyPenalty ?? 0,
            presence_penalty: options?.presencePenalty ?? 0,
            stop: options?.stopSequences,
            stream: false
          })
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(`BoardGuru API error: ${res.status} - ${error}`);
        }
        
        return res.json();
      });
      
      const latency = Date.now() - startTime;
      
      // Track usage
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      };
      
      await this.trackUsage(usage.totalTokens);
      
      // Save usage to database
      await this.saveUsageToDatabase({
        model,
        usage,
        latency,
        cost: await this.estimateCost(model, usage.promptTokens, usage.completionTokens)
      });
      
      return this.createResponse(
        response.choices[0].message.content,
        model,
        usage,
        latency
      );
    } catch (error: any) {
      // Track failed request
      await this.saveUsageToDatabase({
        model,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latency: Date.now() - startTime,
        cost: 0,
        error: error.message
      });
      
      throw error;
    }
  }
  
  async *chatStream(messages: ILLMMessage[], options?: ILLMOptions): AsyncGenerator<ILLMStreamResponse> {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized');
    }
    
    await this.checkRateLimits();
    
    const model = options?.model || this.getDefaultModel();
    
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://appboardguru.com',
        'X-Title': 'AppBoardGuru Enterprise'
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`BoardGuru API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const json = JSON.parse(data);
            const delta = json.choices[0]?.delta?.content || '';
            
            yield {
              id: json.id,
              provider: this.name,
              model,
              delta,
              isComplete: false
            };
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
  
  protected async loadModels(): Promise<void> {
    // BoardGuru curated models for enterprise use
    this.models = [
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Best for complex board governance analysis',
        contextLength: 200000,
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
        capabilities: ['chat', 'analysis', 'reasoning'],
        isAvailable: true
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Excellent for document analysis and summarization',
        contextLength: 128000,
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
        capabilities: ['chat', 'analysis', 'code'],
        isAvailable: true
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and cost',
        contextLength: 200000,
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
        capabilities: ['chat', 'analysis'],
        isAvailable: true
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for simple tasks',
        contextLength: 16385,
        inputCostPer1k: 0.0005,
        outputCostPer1k: 0.0015,
        capabilities: ['chat', 'summarization'],
        isAvailable: true
      }
    ];
  }
  
  getCapabilities(): string[] {
    return [
      'chat',
      'streaming',
      'analysis',
      'summarization',
      'document-processing',
      'multi-turn-conversation',
      'usage-tracking',
      'quota-management'
    ];
  }
  
  getDefaultModel(): string {
    return this.config.defaultModel || 'anthropic/claude-3-sonnet';
  }
  
  /**
   * Check and enforce rate limits
   */
  private async checkRateLimits(): Promise<void> {
    const now = new Date();
    const minuteKey = `${now.getHours()}:${now.getMinutes()}`;
    const hourKey = `${now.getHours()}`;
    
    // Check requests per minute
    const requestsThisMinute = this.requestCount.get(minuteKey) || 0;
    const maxRPM = this.config.maxRequestsPerMinute || 60;
    
    if (requestsThisMinute >= maxRPM) {
      throw new Error(`Rate limit exceeded: ${maxRPM} requests per minute`);
    }
    
    // Check tokens per hour
    const tokensThisHour = this.tokenCount.get(hourKey) || 0;
    const maxTPH = this.config.maxTokensPerHour || 100000;
    
    if (tokensThisHour >= maxTPH) {
      throw new Error(`Token limit exceeded: ${maxTPH} tokens per hour`);
    }
    
    // Update counters
    this.requestCount.set(minuteKey, requestsThisMinute + 1);
  }
  
  /**
   * Track token usage
   */
  private async trackUsage(tokens: number): Promise<void> {
    const now = new Date();
    const hourKey = `${now.getHours()}`;
    
    const tokensThisHour = this.tokenCount.get(hourKey) || 0;
    this.tokenCount.set(hourKey, tokensThisHour + tokens);
  }
  
  /**
   * Save usage data to database
   */
  private async saveUsageToDatabase(data: any): Promise<void> {
    try {
      // This would call the Supabase API to save usage data
      const response = await fetch('/api/llm/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: this.organizationId,
          configurationId: this.config.id,
          providerType: 'boardguru',
          modelName: data.model,
          promptTokens: data.usage.promptTokens,
          completionTokens: data.usage.completionTokens,
          totalTokens: data.usage.totalTokens,
          totalCost: data.cost,
          latencyMs: data.latency,
          status: data.error ? 'error' : 'success',
          errorMessage: data.error
        })
      });
      
      if (!response.ok) {
        console.error('Failed to save usage data:', await response.text());
      }
    } catch (error) {
      console.error('Error saving usage data:', error);
    }
  }
  
  /**
   * Reset rate limit counters periodically
   */
  private startRateLimitResetTimer(): void {
    // Reset minute counter every minute
    setInterval(() => {
      const now = new Date();
      const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
      
      // Keep only current minute
      for (const [key] of this.requestCount) {
        if (key !== currentMinute) {
          this.requestCount.delete(key);
        }
      }
    }, 60000);
    
    // Reset hour counter every hour
    setInterval(() => {
      const now = new Date();
      const currentHour = `${now.getHours()}`;
      
      // Keep only current hour
      for (const [key] of this.tokenCount) {
        if (key !== currentHour) {
          this.tokenCount.delete(key);
        }
      }
    }, 3600000);
  }
  
  /**
   * Get current usage statistics
   */
  async getUsageStats(): Promise<{
    requestsThisMinute: number;
    tokensThisHour: number;
    remainingRequests: number;
    remainingTokens: number;
  }> {
    const now = new Date();
    const minuteKey = `${now.getHours()}:${now.getMinutes()}`;
    const hourKey = `${now.getHours()}`;
    
    const requestsThisMinute = this.requestCount.get(minuteKey) || 0;
    const tokensThisHour = this.tokenCount.get(hourKey) || 0;
    
    return {
      requestsThisMinute,
      tokensThisHour,
      remainingRequests: (this.config.maxRequestsPerMinute || 60) - requestsThisMinute,
      remainingTokens: (this.config.maxTokensPerHour || 100000) - tokensThisHour
    };
  }
}