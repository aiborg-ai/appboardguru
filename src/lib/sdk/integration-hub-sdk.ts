/**
 * Integration Hub SDK
 * Comprehensive TypeScript SDK for third-party developers
 */

import { EventEmitter } from 'events';

// SDK Configuration
export interface SDKConfig {
  apiKey: string;
  baseUrl?: string;
  version?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

// Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Integration Types
export interface Integration {
  id: string;
  name: string;
  type: 'ERP' | 'LEGAL' | 'FINANCIAL' | 'WORKFLOW' | 'CUSTOM';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastSync?: string;
  config: Record<string, any>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
    order: number;
  }>;
  executionCount: number;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  context: Record<string, any>;
  result?: any;
  error?: string;
}

export interface MarketplaceExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  publisher: string;
  category: string;
  pricing: {
    type: 'FREE' | 'PAID' | 'SUBSCRIPTION';
    price?: number;
    currency?: string;
  };
  downloadCount: number;
  ratings: Array<{
    score: number;
    comment?: string;
    createdAt: string;
  }>;
  status: 'PUBLISHED' | 'DRAFT' | 'DEPRECATED';
}

export interface ProcessOptimization {
  id: string;
  processId: string;
  status: 'ANALYZING' | 'RECOMMENDATIONS_READY' | 'IMPLEMENTED' | 'COMPLETED';
  recommendations: Array<{
    id: string;
    type: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    estimatedBenefit: {
      timeReduction: number;
      costReduction: number;
      errorReduction: number;
    };
  }>;
  createdAt: string;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    configuration: Record<string, any>;
  }>;
  createdAt: string;
}

// SDK Error Classes
export class SDKError extends Error {
  public code: string;
  public statusCode?: number;
  public details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class RateLimitError extends SDKError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

export class ValidationError extends SDKError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

// Rate Limiter
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private window: number;

  constructor(maxRequests: number, window: number) {
    this.maxRequests = maxRequests;
    this.window = window;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    this.requests.push(now);
    return true;
  }

  getRetryAfter(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.window - (Date.now() - oldestRequest));
  }
}

// HTTP Client
class HTTPClient {
  private config: SDKConfig;
  private rateLimiter?: RateLimiter;

  constructor(config: SDKConfig) {
    this.config = config;
    
    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(
        config.rateLimit.requests,
        config.rateLimit.window
      );
    }
  }

  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit();
      if (!allowed) {
        const retryAfter = this.rateLimiter.getRetryAfter();
        throw new RateLimitError(`Rate limit exceeded. Retry after ${retryAfter}ms`);
      }
    }

    const url = `${this.config.baseUrl || 'https://api.boardguru.ai'}/api/integration-hub${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': `IntegrationHub-SDK/${this.config.version || '1.0.0'}`,
        ...options?.headers,
      },
      ...options,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestOptions.body = JSON.stringify(data);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
    requestOptions.signal = controller.signal;

    try {
      let attempt = 0;
      const maxRetries = this.config.retries || 3;

      while (attempt <= maxRetries) {
        try {
          if (this.config.debug) {
            console.log(`[SDK] ${method} ${url}`, data);
          }

          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 401) {
              throw new AuthenticationError('Invalid API key or expired token');
            }
            
            if (response.status === 429) {
              throw new RateLimitError('Rate limit exceeded');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new SDKError(
              errorData.error || `HTTP ${response.status}: ${response.statusText}`,
              'HTTP_ERROR',
              response.status,
              errorData
            );
          }

          const result = await response.json();
          
          if (this.config.debug) {
            console.log(`[SDK] Response:`, result);
          }

          return result;
        } catch (error) {
          if (error instanceof SDKError) {
            throw error;
          }

          attempt++;
          if (attempt > maxRetries) {
            throw new SDKError(
              `Request failed after ${maxRetries} retries: ${error.message}`,
              'REQUEST_FAILED'
            );
          }

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new SDKError('Maximum retry attempts exceeded', 'MAX_RETRIES_EXCEEDED');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Main SDK Class
export class IntegrationHubSDK extends EventEmitter {
  private client: HTTPClient;
  private config: SDKConfig;

  // API Modules
  public integrations: IntegrationAPI;
  public workflows: WorkflowAPI;
  public marketplace: MarketplaceAPI;
  public optimization: OptimizationAPI;
  public monitoring: MonitoringAPI;

  constructor(config: SDKConfig) {
    super();
    
    this.config = {
      baseUrl: 'https://api.boardguru.ai',
      version: '1.0.0',
      timeout: 30000,
      retries: 3,
      debug: false,
      ...config,
    };

    this.client = new HTTPClient(this.config);

    // Initialize API modules
    this.integrations = new IntegrationAPI(this.client);
    this.workflows = new WorkflowAPI(this.client);
    this.marketplace = new MarketplaceAPI(this.client);
    this.optimization = new OptimizationAPI(this.client);
    this.monitoring = new MonitoringAPI(this.client);
  }

  // Health check
  async healthCheck(): Promise<APIResponse<{ status: string; version: string }>> {
    return this.client.request('GET', '/health');
  }

  // Get SDK version
  getVersion(): string {
    return this.config.version || '1.0.0';
  }

  // Update configuration
  updateConfig(newConfig: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = new HTTPClient(this.config);
  }
}

// Integration API
class IntegrationAPI {
  constructor(private client: HTTPClient) {}

  async list(): Promise<APIResponse<Integration[]>> {
    return this.client.request('GET', '/integrations');
  }

  async get(integrationId: string): Promise<APIResponse<Integration>> {
    return this.client.request('GET', `/integrations/${integrationId}`);
  }

  async create(integration: Partial<Integration>): Promise<APIResponse<{ integrationId: string }>> {
    return this.client.request('POST', '/integrations', integration);
  }

  async update(integrationId: string, updates: Partial<Integration>): Promise<APIResponse<Integration>> {
    return this.client.request('PUT', `/integrations/${integrationId}`, updates);
  }

  async delete(integrationId: string): Promise<APIResponse<void>> {
    return this.client.request('DELETE', `/integrations/${integrationId}`);
  }

  async connect(integrationId: string): Promise<APIResponse<void>> {
    return this.client.request('POST', `/integrations/${integrationId}/connect`);
  }

  async disconnect(integrationId: string): Promise<APIResponse<void>> {
    return this.client.request('POST', `/integrations/${integrationId}/disconnect`);
  }

  async sync(integrationId: string, options?: { dataType?: string; fullSync?: boolean }): Promise<APIResponse<any[]>> {
    return this.client.request('POST', `/integrations/${integrationId}/sync`, options);
  }
}

// Workflow API
class WorkflowAPI {
  constructor(private client: HTTPClient) {}

  async list(filters?: { enabled?: boolean; category?: string }): Promise<APIResponse<WorkflowRule[]>> {
    const params = new URLSearchParams();
    if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));
    if (filters?.category) params.append('category', filters.category);
    
    const query = params.toString();
    return this.client.request('GET', `/workflows${query ? '?' + query : ''}`);
  }

  async get(ruleId: string): Promise<APIResponse<WorkflowRule>> {
    return this.client.request('GET', `/workflows/${ruleId}`);
  }

  async create(rule: Partial<WorkflowRule>): Promise<APIResponse<{ ruleId: string }>> {
    return this.client.request('POST', '/workflows', rule);
  }

  async update(ruleId: string, updates: Partial<WorkflowRule>): Promise<APIResponse<WorkflowRule>> {
    return this.client.request('PUT', `/workflows/${ruleId}`, updates);
  }

  async delete(ruleId: string): Promise<APIResponse<void>> {
    return this.client.request('DELETE', `/workflows/${ruleId}`);
  }

  async enable(ruleId: string): Promise<APIResponse<void>> {
    return this.client.request('POST', `/workflows/${ruleId}/enable`);
  }

  async disable(ruleId: string): Promise<APIResponse<void>> {
    return this.client.request('POST', `/workflows/${ruleId}/disable`);
  }

  async execute(ruleId: string, context?: Record<string, any>, options?: { async?: boolean }): Promise<APIResponse<WorkflowExecution>> {
    return this.client.request('POST', `/workflows/${ruleId}/execute`, { context, ...options });
  }

  async getExecutionHistory(ruleId: string, limit?: number): Promise<APIResponse<WorkflowExecution[]>> {
    const params = limit ? `?limit=${limit}` : '';
    return this.client.request('GET', `/workflows/${ruleId}/execute${params}`);
  }

  async getExecution(executionId: string): Promise<APIResponse<WorkflowExecution>> {
    return this.client.request('GET', `/executions/${executionId}`);
  }
}

// Marketplace API
class MarketplaceAPI {
  constructor(private client: HTTPClient) {}

  async search(query?: string, filters?: {
    category?: string;
    pricing?: string;
    rating?: number;
    publisher?: string;
  }): Promise<APIResponse<{
    extensions: MarketplaceExtension[];
    categories: any[];
    filters: any;
  }>> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.pricing) params.append('pricing', filters.pricing);
    if (filters?.rating) params.append('rating', String(filters.rating));
    if (filters?.publisher) params.append('publisher', filters.publisher);
    
    const queryString = params.toString();
    return this.client.request('GET', `/marketplace${queryString ? '?' + queryString : ''}`);
  }

  async getFeatured(): Promise<APIResponse<{
    extensions: MarketplaceExtension[];
    categories: any[];
    filters: any;
  }>> {
    return this.client.request('GET', '/marketplace?featured=true');
  }

  async getTrending(): Promise<APIResponse<{
    extensions: MarketplaceExtension[];
    categories: any[];
    filters: any;
  }>> {
    return this.client.request('GET', '/marketplace?trending=true');
  }

  async getExtension(extensionId: string): Promise<APIResponse<MarketplaceExtension>> {
    return this.client.request('GET', `/marketplace/extensions/${extensionId}`);
  }

  async install(extensionId: string, userId: string, organizationId: string): Promise<APIResponse<{
    extensionId: string;
    organizationId: string;
    installedAt: string;
  }>> {
    return this.client.request('POST', `/marketplace/extensions/${extensionId}/install`, {
      userId,
      organizationId,
    });
  }

  async uninstall(extensionId: string, organizationId: string): Promise<APIResponse<void>> {
    return this.client.request('DELETE', `/marketplace/extensions/${extensionId}/install`, {
      organizationId,
    });
  }

  async publish(developerId: string, extension: Partial<MarketplaceExtension>): Promise<APIResponse<{ extensionId: string }>> {
    return this.client.request('POST', '/marketplace', { developerId, extension });
  }
}

// Optimization API
class OptimizationAPI {
  constructor(private client: HTTPClient) {}

  async list(filters?: { status?: string; processType?: string }): Promise<APIResponse<ProcessOptimization[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.processType) params.append('processType', filters.processType);
    
    const query = params.toString();
    return this.client.request('GET', `/ai-optimization${query ? '?' + query : ''}`);
  }

  async analyze(processId: string, processType: string): Promise<APIResponse<{
    optimizationId: string;
    status: string;
    processId: string;
    processType: string;
  }>> {
    return this.client.request('POST', '/ai-optimization', { processId, processType });
  }

  async getRecommendations(optimizationId: string): Promise<APIResponse<{
    optimizationId: string;
    recommendations: any[];
    predictedImpact: any;
  }>> {
    return this.client.request('GET', `/ai-optimization/${optimizationId}/recommendations`);
  }

  async implementRecommendation(optimizationId: string, recommendationId: string): Promise<APIResponse<{
    optimizationId: string;
    recommendationId: string;
    status: string;
  }>> {
    return this.client.request('POST', `/ai-optimization/${optimizationId}/recommendations`, {
      recommendationId,
    });
  }

  async getInsights(processId: string): Promise<APIResponse<any[]>> {
    return this.client.request('GET', `/ai-optimization/insights/${processId}`);
  }
}

// Monitoring API
class MonitoringAPI {
  constructor(private client: HTTPClient) {}

  async getOverview(): Promise<APIResponse<{
    systemOverview: any;
    activeAlerts: number;
    criticalAlerts: number;
    totalDashboards: number;
  }>> {
    return this.client.request('GET', '/monitoring');
  }

  async getDashboards(): Promise<APIResponse<MonitoringDashboard[]>> {
    return this.client.request('GET', '/monitoring/dashboards');
  }

  async getDashboard(dashboardId: string): Promise<APIResponse<MonitoringDashboard>> {
    return this.client.request('GET', `/monitoring/dashboards/${dashboardId}`);
  }

  async createDashboard(dashboard: Partial<MonitoringDashboard>): Promise<APIResponse<{ dashboardId: string }>> {
    return this.client.request('POST', '/monitoring', dashboard);
  }

  async getWidgetData(dashboardId: string, widgetId: string, timeRange?: {
    startDate?: string;
    endDate?: string;
    relative?: string;
  }): Promise<APIResponse<any>> {
    const params = new URLSearchParams();
    if (timeRange?.startDate) params.append('startDate', timeRange.startDate);
    if (timeRange?.endDate) params.append('endDate', timeRange.endDate);
    if (timeRange?.relative) params.append('relative', timeRange.relative);
    
    const query = params.toString();
    return this.client.request('GET', `/monitoring/dashboards/${dashboardId}/widgets/${widgetId}/data${query ? '?' + query : ''}`);
  }

  async getAnalytics(integrationId: string, timeRange?: {
    startDate?: string;
    endDate?: string;
    relative?: string;
  }): Promise<APIResponse<any>> {
    const params = new URLSearchParams();
    if (timeRange?.startDate) params.append('startDate', timeRange.startDate);
    if (timeRange?.endDate) params.append('endDate', timeRange.endDate);
    if (timeRange?.relative) params.append('relative', timeRange.relative);
    
    const query = params.toString();
    return this.client.request('GET', `/monitoring/analytics/${integrationId}${query ? '?' + query : ''}`);
  }

  async getAlerts(severity?: 'info' | 'warning' | 'error' | 'critical'): Promise<APIResponse<any[]>> {
    const params = severity ? `?severity=${severity}` : '';
    return this.client.request('GET', `/monitoring/alerts${params}`);
  }
}

// Utility Functions
export const utils = {
  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    return /^[a-zA-Z0-9_-]{32,}$/.test(apiKey);
  },

  /**
   * Format error message from SDK error
   */
  formatError(error: any): string {
    if (error instanceof SDKError) {
      return `${error.code}: ${error.message}${error.details ? ` (${JSON.stringify(error.details)})` : ''}`;
    }
    return error.message || 'Unknown error';
  },

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: any): any {
    try {
      return typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      throw new ValidationError('Invalid webhook payload format');
    }
  },

  /**
   * Generate request ID for tracking
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Retry helper with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: {
      retries?: number;
      minDelay?: number;
      maxDelay?: number;
      factor?: number;
    } = {}
  ): Promise<T> {
    const { retries = 3, minDelay = 1000, maxDelay = 10000, factor = 2 } = options;
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === retries) {
          throw error;
        }
        
        const delay = Math.min(minDelay * Math.pow(factor, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },
};

// Export SDK instance creator
export function createSDK(config: SDKConfig): IntegrationHubSDK {
  if (!config.apiKey) {
    throw new ValidationError('API key is required');
  }
  
  if (!utils.validateApiKey(config.apiKey)) {
    throw new ValidationError('Invalid API key format');
  }
  
  return new IntegrationHubSDK(config);
}

// Default export
export default IntegrationHubSDK;