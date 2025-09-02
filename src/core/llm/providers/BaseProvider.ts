/**
 * Base LLM Provider Implementation
 * Abstract class that all providers extend
 */

import {
  ILLMProvider,
  ILLMMessage,
  ILLMOptions,
  ILLMResponse,
  ILLMStreamResponse,
  ILLMModel,
  ILLMProviderStatus
} from '../interfaces/ILLMProvider';

export abstract class BaseProvider implements ILLMProvider {
  abstract readonly name: string;
  abstract readonly type: 'local' | 'api' | 'boardguru';
  abstract readonly priority: number;
  
  protected config: any;
  protected isInitialized: boolean = false;
  protected lastHealthCheck: Date | null = null;
  protected models: ILLMModel[] = [];
  
  constructor(config?: any) {
    this.config = config || {};
  }
  
  async initialize(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isInitialized = true;
    await this.loadModels();
  }
  
  async dispose(): Promise<void> {
    this.isInitialized = false;
    this.models = [];
  }
  
  abstract chat(messages: ILLMMessage[], options?: ILLMOptions): Promise<ILLMResponse>;
  
  async chatStream?(messages: ILLMMessage[], options?: ILLMOptions): AsyncGenerator<ILLMStreamResponse> {
    throw new Error('Streaming not supported by this provider');
  }
  
  async testConnection(): Promise<ILLMProviderStatus> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.healthCheck();
      const latency = Date.now() - startTime;
      
      return {
        isConnected,
        latency,
        lastChecked: new Date(),
        availableModels: this.models
      };
    } catch (error: any) {
      return {
        isConnected: false,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }
  
  async listModels(): Promise<ILLMModel[]> {
    if (this.models.length === 0) {
      await this.loadModels();
    }
    return this.models;
  }
  
  async getModel(modelId: string): Promise<ILLMModel | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }
  
  async estimateCost(model: string, inputTokens: number, outputTokens: number): Promise<number> {
    const modelInfo = await this.getModel(model);
    if (!modelInfo || !modelInfo.inputCostPer1k || !modelInfo.outputCostPer1k) {
      return 0;
    }
    
    const inputCost = (inputTokens / 1000) * modelInfo.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * modelInfo.outputCostPer1k;
    
    return inputCost + outputCost;
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list models as a health check
      const models = await this.listModels();
      this.lastHealthCheck = new Date();
      return models.length > 0;
    } catch {
      return false;
    }
  }
  
  abstract getCapabilities(): string[];
  abstract getDefaultModel(): string;
  
  supportsStreaming(): boolean {
    return typeof this.chatStream === 'function';
  }
  
  requiresApiKey(): boolean {
    return this.type === 'api';
  }
  
  protected abstract loadModels(): Promise<void>;
  
  /**
   * Helper method to count tokens (approximate)
   */
  protected estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Helper method to create a response object
   */
  protected createResponse(
    content: string,
    model: string,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    latency?: number
  ): ILLMResponse {
    return {
      id: `${this.name}-${Date.now()}`,
      provider: this.name,
      model,
      content,
      usage,
      cost: usage ? this.estimateCost(model, usage.promptTokens, usage.completionTokens) : undefined,
      latency,
      timestamp: new Date()
    };
  }
  
  /**
   * Helper method to format messages for API calls
   */
  protected formatMessages(messages: ILLMMessage[]): any {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.function_call && { function_call: msg.function_call })
    }));
  }
  
  /**
   * Helper method for retrying requests
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}