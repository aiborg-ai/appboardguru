/**
 * Local LLM Provider
 * Supports Ollama, LM Studio, LocalAI, and other local LLM servers
 */

import { BaseProvider } from './BaseProvider';
import {
  ILLMMessage,
  ILLMOptions,
  ILLMResponse,
  ILLMStreamResponse,
  ILLMModel
} from '../interfaces/ILLMProvider';

interface LocalLLMConfig {
  type: 'ollama' | 'lm-studio' | 'localai' | 'custom';
  endpoint: string;
  port?: number;
  apiPath?: string;
  models?: string[];
  timeout?: number;
  headers?: Record<string, string>;
}

export class LocalLLMProvider extends BaseProvider {
  readonly name = 'LocalLLM';
  readonly type = 'local' as const;
  readonly priority = 10; // Lower priority than BoardGuru
  
  private endpoint: string;
  private localType: string;
  private timeout: number;
  private headers: Record<string, string>;
  
  constructor(config: LocalLLMConfig) {
    super(config);
    this.localType = config.type;
    this.endpoint = this.buildEndpoint(config);
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
  }
  
  private buildEndpoint(config: LocalLLMConfig): string {
    const base = config.endpoint || 'http://localhost';
    const port = config.port || this.getDefaultPort(config.type);
    const path = config.apiPath || this.getDefaultPath(config.type);
    
    return `${base}:${port}${path}`;
  }
  
  private getDefaultPort(type: string): number {
    switch (type) {
      case 'ollama':
        return 11434;
      case 'lm-studio':
        return 1234;
      case 'localai':
        return 8080;
      default:
        return 8000;
    }
  }
  
  private getDefaultPath(type: string): string {
    switch (type) {
      case 'ollama':
        return '/api';
      case 'lm-studio':
        return '/v1';
      case 'localai':
        return '/v1';
      default:
        return '';
    }
  }
  
  async initialize(config: LocalLLMConfig): Promise<void> {
    await super.initialize(config);
    
    // Test connection to local LLM
    const status = await this.testConnection();
    if (!status.isConnected) {
      throw new Error(`Failed to connect to local LLM at ${this.endpoint}: ${status.error}`);
    }
  }
  
  async chat(messages: ILLMMessage[], options?: ILLMOptions): Promise<ILLMResponse> {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized');
    }
    
    const model = options?.model || this.getDefaultModel();
    const startTime = Date.now();
    
    try {
      let response;
      
      switch (this.localType) {
        case 'ollama':
          response = await this.chatOllama(messages, model, options);
          break;
        case 'lm-studio':
        case 'localai':
          response = await this.chatOpenAICompatible(messages, model, options);
          break;
        default:
          response = await this.chatCustom(messages, model, options);
      }
      
      const latency = Date.now() - startTime;
      
      return this.createResponse(
        response.content,
        model,
        response.usage,
        latency
      );
    } catch (error: any) {
      throw new Error(`Local LLM error: ${error.message}`);
    }
  }
  
  private async chatOllama(
    messages: ILLMMessage[],
    model: string,
    options?: ILLMOptions
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(`${this.endpoint}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          stream: false,
          options: {
            temperature: options?.temperature,
            top_p: options?.topP,
            num_predict: options?.maxTokens
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Estimate tokens for local models
      const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
      const completionTokens = this.estimateTokens(data.message.content);
      
      return {
        content: data.message.content,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        }
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
  
  private async chatOpenAICompatible(
    messages: ILLMMessage[],
    model: string,
    options?: ILLMOptions
  ): Promise<any> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }
  
  private async chatCustom(
    messages: ILLMMessage[],
    model: string,
    options?: ILLMOptions
  ): Promise<any> {
    // For custom endpoints, use OpenAI format by default
    return this.chatOpenAICompatible(messages, model, options);
  }
  
  async *chatStream(messages: ILLMMessage[], options?: ILLMOptions): AsyncGenerator<ILLMStreamResponse> {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized');
    }
    
    const model = options?.model || this.getDefaultModel();
    
    if (this.localType === 'ollama') {
      yield* this.streamOllama(messages, model, options);
    } else {
      yield* this.streamOpenAICompatible(messages, model, options);
    }
  }
  
  private async *streamOllama(
    messages: ILLMMessage[],
    model: string,
    options?: ILLMOptions
  ): AsyncGenerator<ILLMStreamResponse> {
    const response = await fetch(`${this.endpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens
        }
      })
    });
    
    if (!response.ok || !response.body) {
      throw new Error(`Ollama stream error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            
            yield {
              id: `ollama-${Date.now()}`,
              provider: this.name,
              model,
              delta: data.message?.content || '',
              isComplete: data.done || false
            };
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
  
  private async *streamOpenAICompatible(
    messages: ILLMMessage[],
    model: string,
    options?: ILLMOptions
  ): AsyncGenerator<ILLMStreamResponse> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stream: true
      })
    });
    
    if (!response.ok || !response.body) {
      throw new Error(`Local LLM stream error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
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
    try {
      if (this.localType === 'ollama') {
        await this.loadOllamaModels();
      } else {
        await this.loadOpenAICompatibleModels();
      }
    } catch (error) {
      console.error('Failed to load local models:', error);
      // Use default models if loading fails
      this.loadDefaultModels();
    }
  }
  
  private async loadOllamaModels(): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/tags`, {
        headers: this.headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        this.models = data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          description: `Local ${model.name} model`,
          contextLength: model.details?.parameter_size || 8192,
          inputCostPer1k: 0,
          outputCostPer1k: 0,
          capabilities: ['chat', 'completion'],
          isAvailable: true
        })) || [];
      }
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
      this.loadDefaultModels();
    }
  }
  
  private async loadOpenAICompatibleModels(): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        headers: this.headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        this.models = data.data?.map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `Local ${model.id} model`,
          contextLength: model.context_length || 8192,
          inputCostPer1k: 0,
          outputCostPer1k: 0,
          capabilities: model.capabilities || ['chat'],
          isAvailable: true
        })) || [];
      }
    } catch (error) {
      console.error('Failed to load OpenAI-compatible models:', error);
      this.loadDefaultModels();
    }
  }
  
  private loadDefaultModels(): void {
    // Default models for common local LLMs
    this.models = [
      {
        id: 'llama3:latest',
        name: 'Llama 3',
        description: 'Meta\'s Llama 3 model',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion'],
        isAvailable: true
      },
      {
        id: 'mistral:latest',
        name: 'Mistral',
        description: 'Mistral AI model',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion'],
        isAvailable: true
      },
      {
        id: 'codellama:latest',
        name: 'Code Llama',
        description: 'Code-focused Llama model',
        contextLength: 16384,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'code', 'completion'],
        isAvailable: true
      }
    ];
  }
  
  async testConnection(): Promise<any> {
    try {
      // Try to fetch models or make a health check
      const endpoint = this.localType === 'ollama' ? `${this.endpoint}/tags` : `${this.endpoint}/models`;
      
      const response = await fetch(endpoint, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const isConnected = response.ok;
      
      return {
        isConnected,
        latency: 0,
        lastChecked: new Date(),
        availableModels: isConnected ? this.models : [],
        error: isConnected ? undefined : `HTTP ${response.status}`
      };
    } catch (error: any) {
      return {
        isConnected: false,
        error: error.message || 'Connection failed',
        lastChecked: new Date()
      };
    }
  }
  
  getCapabilities(): string[] {
    return [
      'chat',
      'streaming',
      'completion',
      'zero-cost',
      'privacy',
      'offline',
      'no-rate-limits'
    ];
  }
  
  getDefaultModel(): string {
    if (this.models.length > 0) {
      return this.models[0].id;
    }
    
    // Fallback defaults
    switch (this.localType) {
      case 'ollama':
        return 'llama3:latest';
      case 'lm-studio':
        return 'local-model';
      default:
        return 'default';
    }
  }
  
  /**
   * Auto-detect local LLM servers
   */
  static async detectLocalServers(): Promise<LocalLLMConfig[]> {
    const configs: LocalLLMConfig[] = [];
    
    // Check common Ollama port
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(1000)
      });
      
      if (response.ok) {
        configs.push({
          type: 'ollama',
          endpoint: 'http://localhost',
          port: 11434
        });
      }
    } catch {
      // Ollama not found
    }
    
    // Check common LM Studio port
    try {
      const response = await fetch('http://localhost:1234/v1/models', {
        signal: AbortSignal.timeout(1000)
      });
      
      if (response.ok) {
        configs.push({
          type: 'lm-studio',
          endpoint: 'http://localhost',
          port: 1234
        });
      }
    } catch {
      // LM Studio not found
    }
    
    // Check LocalAI
    try {
      const response = await fetch('http://localhost:8080/v1/models', {
        signal: AbortSignal.timeout(1000)
      });
      
      if (response.ok) {
        configs.push({
          type: 'localai',
          endpoint: 'http://localhost',
          port: 8080
        });
      }
    } catch {
      // LocalAI not found
    }
    
    return configs;
  }
}