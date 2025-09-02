/**
 * LLM Configuration Interfaces
 */

export type LLMProviderType = 'local' | 'openrouter' | 'openai' | 'anthropic' | 'boardguru' | 'custom';

export interface ILLMBaseConfig {
  id: string;
  name: string;
  type: LLMProviderType;
  isActive: boolean;
  isPrimary: boolean;
  priority: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILocalLLMConfig extends ILLMBaseConfig {
  type: 'local';
  endpoint: string;
  port?: number;
  apiPath?: string;
  models: string[];
  timeout?: number;
  headers?: Record<string, string>;
}

export interface IOpenRouterConfig extends ILLMBaseConfig {
  type: 'openrouter';
  apiKey: string; // Encrypted
  endpoint?: string; // Default: https://openrouter.ai/api/v1
  models?: string[];
  siteUrl?: string;
  siteName?: string;
  maxRetries?: number;
}

export interface IOpenAIConfig extends ILLMBaseConfig {
  type: 'openai';
  apiKey: string; // Encrypted
  organization?: string;
  endpoint?: string; // For Azure OpenAI or custom endpoints
  apiVersion?: string;
  models?: string[];
}

export interface IAnthropicConfig extends ILLMBaseConfig {
  type: 'anthropic';
  apiKey: string; // Encrypted
  endpoint?: string;
  models?: string[];
  anthropicVersion?: string;
}

export interface IBoardGuruConfig extends ILLMBaseConfig {
  type: 'boardguru';
  endpoint: string;
  apiKey?: string; // Optional for custom instances
  organizationQuota?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
}

export interface ICustomLLMConfig extends ILLMBaseConfig {
  type: 'custom';
  endpoint: string;
  apiKey?: string;
  authType?: 'bearer' | 'apikey' | 'basic' | 'none';
  headers?: Record<string, string>;
  requestFormat?: 'openai' | 'custom';
  responseFormat?: 'openai' | 'custom';
  transformRequest?: string; // JavaScript function as string
  transformResponse?: string; // JavaScript function as string
}

export type LLMConfig = 
  | ILocalLLMConfig 
  | IOpenRouterConfig 
  | IOpenAIConfig 
  | IAnthropicConfig 
  | IBoardGuruConfig 
  | ICustomLLMConfig;

export interface ILLMConfigManager {
  // Configuration management
  saveConfig(config: LLMConfig): Promise<void>;
  loadConfig(configId: string): Promise<LLMConfig | null>;
  listConfigs(organizationId: string): Promise<LLMConfig[]>;
  deleteConfig(configId: string): Promise<void>;
  
  // Primary configuration
  setPrimaryConfig(configId: string): Promise<void>;
  getPrimaryConfig(organizationId: string): Promise<LLMConfig | null>;
  
  // Encryption
  encryptApiKey(apiKey: string): Promise<string>;
  decryptApiKey(encryptedKey: string): Promise<string>;
  
  // Validation
  validateConfig(config: LLMConfig): Promise<boolean>;
  testConfig(config: LLMConfig): Promise<boolean>;
}

export interface ILLMFallbackStrategy {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackOrder: string[]; // Config IDs in order of preference
  conditions: {
    onError: boolean;
    onTimeout: boolean;
    onRateLimit: boolean;
    onQuotaExceeded: boolean;
  };
}

export interface ILLMUsageConfig {
  trackUsage: boolean;
  alertThresholds: {
    costPerDay?: number;
    tokensPerHour?: number;
    requestsPerMinute?: number;
  };
  quotas: {
    maxCostPerMonth?: number;
    maxTokensPerDay?: number;
    maxRequestsPerHour?: number;
  };
  billing: {
    enabled: boolean;
    markupPercentage?: number;
    fixedMonthlyFee?: number;
  };
}