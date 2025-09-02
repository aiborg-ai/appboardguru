/**
 * Core LLM Provider Interface
 * All LLM providers must implement this interface
 */

export interface ILLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface ILLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  timeout?: number;
  retryCount?: number;
}

export interface ILLMResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  latency?: number;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ILLMStreamResponse {
  id: string;
  provider: string;
  model: string;
  delta: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface ILLMModel {
  id: string;
  name: string;
  description?: string;
  contextLength: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  capabilities?: string[];
  isAvailable: boolean;
}

export interface ILLMProviderStatus {
  isConnected: boolean;
  latency?: number;
  error?: string;
  lastChecked: Date;
  availableModels?: ILLMModel[];
}

export interface ILLMProvider {
  // Provider identification
  readonly name: string;
  readonly type: 'local' | 'api' | 'boardguru';
  readonly priority: number;
  
  // Lifecycle methods
  initialize(config: any): Promise<void>;
  testConnection(): Promise<ILLMProviderStatus>;
  dispose(): Promise<void>;
  
  // Core functionality
  chat(messages: ILLMMessage[], options?: ILLMOptions): Promise<ILLMResponse>;
  chatStream?(messages: ILLMMessage[], options?: ILLMOptions): AsyncGenerator<ILLMStreamResponse>;
  
  // Model management
  listModels(): Promise<ILLMModel[]>;
  getModel(modelId: string): Promise<ILLMModel | null>;
  
  // Cost estimation
  estimateCost(model: string, inputTokens: number, outputTokens: number): Promise<number>;
  
  // Health check
  healthCheck(): Promise<boolean>;
  
  // Metadata
  getCapabilities(): string[];
  getDefaultModel(): string;
  supportsStreaming(): boolean;
  requiresApiKey(): boolean;
}

// Provider factory type
export type LLMProviderConstructor = new (config: any) => ILLMProvider;