/**
 * LLM Manager - Central orchestrator for all LLM operations
 * Handles provider selection, fallbacks, and usage tracking
 */

import { ILLMProvider, ILLMMessage, ILLMOptions, ILLMResponse } from '../interfaces/ILLMProvider';
import { LLMConfig } from '../interfaces/ILLMConfig';
import { BoardGuruProvider } from '../providers/BoardGuruProvider';
import { LocalLLMProvider } from '../providers/LocalLLMProvider';
import { keyVault } from '../security/KeyVault';

interface LLMManagerOptions {
  organizationId: string;
  userId: string;
  enableFallback?: boolean;
  enableCaching?: boolean;
  enableUsageTracking?: boolean;
}

interface ProviderInstance {
  provider: ILLMProvider;
  config: LLMConfig;
  priority: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
}

export class LLMManager {
  private providers: Map<string, ProviderInstance> = new Map();
  private primaryProvider: ProviderInstance | null = null;
  private organizationId: string;
  private userId: string;
  private options: LLMManagerOptions;
  private responseCache: Map<string, ILLMResponse> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(options: LLMManagerOptions) {
    this.organizationId = options.organizationId;
    this.userId = options.userId;
    this.options = options;
  }
  
  /**
   * Initialize the LLM Manager with configurations
   */
  async initialize(): Promise<void> {
    // Load configurations from database
    const configs = await this.loadConfigurations();
    
    // Initialize providers
    for (const config of configs) {
      if (config.isActive) {
        await this.initializeProvider(config);
      }
    }
    
    // Set primary provider
    this.setPrimaryFromConfigs(configs);
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // If no providers configured, use BoardGuru default
    if (this.providers.size === 0) {
      await this.initializeDefaultProvider();
    }
  }
  
  /**
   * Main chat interface with automatic fallback
   */
  async chat(
    messages: ILLMMessage[],
    options?: ILLMOptions & { preferredProvider?: string; allowFallback?: boolean }
  ): Promise<ILLMResponse> {
    // Check cache if enabled
    if (this.options.enableCaching) {
      const cacheKey = this.getCacheKey(messages, options);
      const cached = this.responseCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return { ...cached, metadata: { ...cached.metadata, fromCache: true } };
      }
    }
    
    // Get ordered list of providers to try
    const providersToTry = this.getProviderOrder(options?.preferredProvider);
    
    let lastError: Error | null = null;
    let attempts = 0;
    
    for (const instance of providersToTry) {
      if (!instance.isHealthy && attempts > 0) {
        continue; // Skip unhealthy providers after first attempt
      }
      
      try {
        attempts++;
        
        // Try the provider
        const response = await this.executeChat(instance, messages, options);
        
        // Track usage if enabled
        if (this.options.enableUsageTracking) {
          await this.trackUsage(instance, response);
        }
        
        // Cache response if enabled
        if (this.options.enableCaching) {
          const cacheKey = this.getCacheKey(messages, options);
          this.responseCache.set(cacheKey, response);
        }
        
        // Mark provider as healthy
        instance.isHealthy = true;
        
        return response;
        
      } catch (error: any) {
        lastError = error;
        console.error(`Provider ${instance.config.name} failed:`, error.message);
        
        // Mark provider as unhealthy
        instance.isHealthy = false;
        
        // If fallback is disabled, throw immediately
        if (options?.allowFallback === false || !this.options.enableFallback) {
          throw error;
        }
        
        // Continue to next provider
      }
    }
    
    // All providers failed
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }
  
  /**
   * Stream chat with automatic fallback
   */
  async *chatStream(
    messages: ILLMMessage[],
    options?: ILLMOptions & { preferredProvider?: string }
  ): AsyncGenerator<any> {
    const providersToTry = this.getProviderOrder(options?.preferredProvider);
    
    for (const instance of providersToTry) {
      if (!instance.provider.supportsStreaming()) {
        continue;
      }
      
      try {
        const stream = instance.provider.chatStream!(messages, options);
        
        for await (const chunk of stream) {
          yield chunk;
        }
        
        return;
      } catch (error) {
        console.error(`Stream provider ${instance.config.name} failed:`, error);
        // Try next provider
      }
    }
    
    throw new Error('No streaming providers available');
  }
  
  /**
   * Execute chat with a specific provider
   */
  private async executeChat(
    instance: ProviderInstance,
    messages: ILLMMessage[],
    options?: ILLMOptions
  ): Promise<ILLMResponse> {
    const startTime = Date.now();
    
    try {
      const response = await instance.provider.chat(messages, options);
      
      // Add metadata
      response.metadata = {
        ...response.metadata,
        organizationId: this.organizationId,
        userId: this.userId,
        configId: instance.config.id,
        executionTime: Date.now() - startTime
      };
      
      return response;
    } catch (error) {
      // Log error for debugging
      await this.logError(instance, error as Error, messages);
      throw error;
    }
  }
  
  /**
   * Initialize a provider from configuration
   */
  private async initializeProvider(config: LLMConfig): Promise<void> {
    try {
      let provider: ILLMProvider;
      
      // Decrypt API keys if needed
      if ('apiKey' in config && config.apiKey) {
        config.apiKey = await keyVault.decrypt(config.apiKey);
      }
      
      // Create provider based on type
      switch (config.type) {
        case 'local':
          provider = new LocalLLMProvider(config as any);
          break;
        
        case 'boardguru':
          provider = new BoardGuruProvider({
            ...config,
            organizationId: this.organizationId
          } as any);
          break;
        
        case 'openrouter':
          // Would import OpenRouterProvider here
          provider = new BoardGuruProvider(config as any); // Placeholder
          break;
        
        default:
          console.warn(`Unknown provider type: ${config.type}`);
          return;
      }
      
      // Initialize the provider
      await provider.initialize(config);
      
      // Test connection
      const status = await provider.testConnection();
      
      // Add to providers map
      this.providers.set(config.id, {
        provider,
        config,
        priority: config.priority,
        isHealthy: status.isConnected,
        lastHealthCheck: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to initialize provider ${config.name}:`, error);
    }
  }
  
  /**
   * Initialize default BoardGuru provider
   */
  private async initializeDefaultProvider(): Promise<void> {
    const config: LLMConfig = {
      id: 'default-boardguru',
      name: 'BoardGuru Default',
      type: 'boardguru',
      isActive: true,
      isPrimary: true,
      priority: 100,
      organizationId: this.organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    
    await this.initializeProvider(config);
    
    const instance = this.providers.get('default-boardguru');
    if (instance) {
      this.primaryProvider = instance;
    }
  }
  
  /**
   * Load configurations from database
   */
  private async loadConfigurations(): Promise<LLMConfig[]> {
    try {
      const response = await fetch(`/api/llm/configurations?organizationId=${this.organizationId}`);
      
      if (!response.ok) {
        console.error('Failed to load LLM configurations');
        return [];
      }
      
      const data = await response.json();
      return data.configurations || [];
    } catch (error) {
      console.error('Error loading LLM configurations:', error);
      return [];
    }
  }
  
  /**
   * Set primary provider from configurations
   */
  private setPrimaryFromConfigs(configs: LLMConfig[]): void {
    const primaryConfig = configs.find(c => c.isPrimary);
    
    if (primaryConfig) {
      const instance = this.providers.get(primaryConfig.id);
      if (instance) {
        this.primaryProvider = instance;
      }
    }
  }
  
  /**
   * Get ordered list of providers to try
   */
  private getProviderOrder(preferredProviderId?: string): ProviderInstance[] {
    const providers = Array.from(this.providers.values());
    
    // If preferred provider specified, try it first
    if (preferredProviderId) {
      const preferred = this.providers.get(preferredProviderId);
      if (preferred) {
        return [preferred, ...providers.filter(p => p.config.id !== preferredProviderId)];
      }
    }
    
    // Otherwise, sort by priority
    return providers.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Generate cache key for requests
   */
  private getCacheKey(messages: ILLMMessage[], options?: ILLMOptions): string {
    const key = JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      model: options?.model,
      temperature: options?.temperature
    });
    
    return Buffer.from(key).toString('base64');
  }
  
  /**
   * Check if cached response is still valid
   */
  private isCacheValid(response: ILLMResponse): boolean {
    const cacheTime = 5 * 60 * 1000; // 5 minutes
    const age = Date.now() - response.timestamp.getTime();
    return age < cacheTime;
  }
  
  /**
   * Track usage for billing and analytics
   */
  private async trackUsage(instance: ProviderInstance, response: ILLMResponse): Promise<void> {
    try {
      await fetch('/api/llm/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: this.organizationId,
          userId: this.userId,
          configurationId: instance.config.id,
          providerType: instance.config.type,
          modelName: response.model,
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          totalTokens: response.usage?.totalTokens || 0,
          totalCost: response.cost || 0,
          latencyMs: response.latency || 0,
          status: 'success'
        })
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  }
  
  /**
   * Log errors for debugging
   */
  private async logError(instance: ProviderInstance, error: Error, messages: ILLMMessage[]): Promise<void> {
    try {
      await fetch('/api/llm/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: this.organizationId,
          userId: this.userId,
          configurationId: instance.config.id,
          error: error.message,
          stack: error.stack,
          requestSample: messages[0]?.content.substring(0, 500)
        })
      });
    } catch {
      // Ignore logging errors
    }
  }
  
  /**
   * Start health monitoring for providers
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      for (const [id, instance] of this.providers) {
        try {
          const status = await instance.provider.testConnection();
          instance.isHealthy = status.isConnected;
          instance.lastHealthCheck = new Date();
        } catch {
          instance.isHealthy = false;
        }
      }
    }, 30000);
  }
  
  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Dispose all providers
    for (const instance of this.providers.values()) {
      await instance.provider.dispose();
    }
    
    // Clear cache
    this.responseCache.clear();
    
    // Clear providers
    this.providers.clear();
  }
  
  /**
   * Get current provider statistics
   */
  getStatistics(): {
    totalProviders: number;
    healthyProviders: number;
    primaryProvider: string | null;
    cacheSize: number;
  } {
    const healthy = Array.from(this.providers.values()).filter(p => p.isHealthy).length;
    
    return {
      totalProviders: this.providers.size,
      healthyProviders: healthy,
      primaryProvider: this.primaryProvider?.config.name || null,
      cacheSize: this.responseCache.size
    };
  }
  
  /**
   * List available models from all providers
   */
  async listAllModels(): Promise<Array<{ provider: string; models: any[] }>> {
    const results = [];
    
    for (const [id, instance] of this.providers) {
      if (instance.isHealthy) {
        try {
          const models = await instance.provider.listModels();
          results.push({
            provider: instance.config.name,
            models
          });
        } catch (error) {
          console.error(`Failed to list models for ${instance.config.name}:`, error);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Add a new provider at runtime
   */
  async addProvider(config: LLMConfig): Promise<void> {
    await this.initializeProvider(config);
  }
  
  /**
   * Remove a provider at runtime
   */
  async removeProvider(configId: string): Promise<void> {
    const instance = this.providers.get(configId);
    
    if (instance) {
      await instance.provider.dispose();
      this.providers.delete(configId);
      
      // If this was the primary, select a new one
      if (this.primaryProvider?.config.id === configId) {
        this.primaryProvider = Array.from(this.providers.values())
          .sort((a, b) => b.priority - a.priority)[0] || null;
      }
    }
  }
}