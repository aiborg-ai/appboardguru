/**
 * Mobile API Client
 * HTTP client with automatic retry, offline queuing, and certificate pinning
 * Integrates with existing repository patterns and Result types
 */

import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

import type { Result, OfflineAction, OfflineActionId } from '@/types/mobile';
import { Environment } from '@/config/env';
import { API, OFFLINE } from '@/config/constants';
import { createLogger } from '@/utils/logger';
import { secureStorageService } from '../auth/SecureStorageService';
import { offlineStorageService } from '../storage/OfflineStorageService';

const logger = createLogger('MobileApiClient');

export interface ApiRequestConfig {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly url: string;
  readonly data?: any;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly requiresAuth?: boolean;
  readonly offlineCapable?: boolean;
  readonly priority?: 'critical' | 'high' | 'normal' | 'low';
}

export interface ApiResponse<T = any> {
  readonly data: T;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly fromCache: boolean;
  readonly requestId: string;
}

export interface RetryConfig {
  readonly maxAttempts: number;
  readonly backoffMultiplier: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
}

export class MobileApiClient {
  private readonly baseUrl = Environment.apiUrl;
  private readonly defaultTimeout = API.DEFAULT_TIMEOUT;
  private readonly maxConcurrentRequests = API.MAX_CONCURRENT_REQUESTS;
  private activeRequests = new Set<string>();
  private requestQueue: Array<() => Promise<void>> = [];
  private isOnline = true;

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Make HTTP request with automatic retry and offline handling
   */
  async request<T>(config: ApiRequestConfig): Promise<Result<ApiResponse<T>>> {
    const requestId = this.generateRequestId();
    
    try {
      logger.info('Making API request', { 
        method: config.method, 
        url: config.url, 
        requestId 
      });

      // Check if we're online
      if (!this.isOnline && config.offlineCapable) {
        return await this.handleOfflineRequest(config, requestId);
      }

      // Check rate limiting
      if (this.activeRequests.size >= this.maxConcurrentRequests) {
        return await this.queueRequest(config, requestId);
      }

      this.activeRequests.add(requestId);

      try {
        const result = await this.executeRequest<T>(config, requestId);
        return result;
      } finally {
        this.activeRequests.delete(requestId);
        this.processQueue();
      }
    } catch (error) {
      logger.error('API request failed', { error, requestId });
      return {
        success: false,
        error: {
          code: 'API_REQUEST_FAILED',
          message: 'API request failed',
          details: error,
        },
      };
    }
  }

  /**
   * Execute the actual HTTP request with retry logic
   */
  private async executeRequest<T>(
    config: ApiRequestConfig,
    requestId: string,
    attempt = 1
  ): Promise<Result<ApiResponse<T>>> {
    try {
      // Prepare headers
      const headers = await this.prepareHeaders(config);
      
      // Setup request options
      const requestOptions: RequestInit = {
        method: config.method,
        headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: AbortSignal.timeout(config.timeout || this.defaultTimeout),
      };

      // Add certificate pinning for production
      if (Environment.sslPinningEnabled && Environment.isProduction) {
        // TODO: Implement certificate pinning using react-native-ssl-pinning
      }

      const response = await fetch(`${this.baseUrl}${config.url}`, requestOptions);
      
      // Handle non-2xx responses
      if (!response.ok) {
        if (response.status >= 500 && attempt < (config.retryCount || API.MAX_RETRY_ATTEMPTS)) {
          // Retry on server errors
          await this.delay(this.calculateBackoffDelay(attempt));
          return this.executeRequest(config, requestId, attempt + 1);
        }
        
        const errorText = await response.text();
        logger.warn('API request returned error status', {
          status: response.status,
          error: errorText,
          requestId,
        });
        
        return {
          success: false,
          error: {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${errorText}`,
            details: {
              status: response.status,
              body: errorText,
            },
          },
        };
      }

      // Parse response
      const responseData = await response.json();
      
      const apiResponse: ApiResponse<T> = {
        data: responseData,
        status: response.status,
        headers: this.extractHeaders(response),
        fromCache: false,
        requestId,
      };

      logger.info('API request successful', { 
        status: response.status, 
        requestId 
      });

      return { success: true, data: apiResponse };
    } catch (error: any) {
      // Handle network errors with retry
      if (this.isNetworkError(error) && attempt < (config.retryCount || API.MAX_RETRY_ATTEMPTS)) {
        logger.warn('Network error, retrying', { attempt, maxAttempts: config.retryCount || API.MAX_RETRY_ATTEMPTS });
        await this.delay(this.calculateBackoffDelay(attempt));
        return this.executeRequest(config, requestId, attempt + 1);
      }

      logger.error('Request execution failed', { error, requestId, attempt });
      return {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: error.message || 'Request failed',
          details: error,
        },
      };
    }
  }

  /**
   * Handle offline requests by queueing them
   */
  private async handleOfflineRequest<T>(
    config: ApiRequestConfig,
    requestId: string
  ): Promise<Result<ApiResponse<T>>> {
    try {
      logger.info('Handling offline request', { requestId });

      // Create offline action
      const offlineAction: OfflineAction = {
        id: requestId as OfflineActionId,
        type: this.mapRequestToActionType(config),
        data: {
          method: config.method,
          url: config.url,
          body: config.data,
          headers: config.headers,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        retryCount: 0,
        priority: config.priority || 'normal',
      };

      // Store in offline queue
      const queueResult = await offlineStorageService.queueAction(offlineAction);
      if (!queueResult.success) {
        return {
          success: false,
          error: {
            code: 'OFFLINE_QUEUE_FAILED',
            message: 'Failed to queue offline action',
            details: queueResult.error,
          },
        };
      }

      // Try to get cached response if available
      const cachedResult = await offlineStorageService.getCachedResponse(config.url);
      if (cachedResult.success && cachedResult.data) {
        const apiResponse: ApiResponse<T> = {
          data: cachedResult.data,
          status: 200,
          headers: {},
          fromCache: true,
          requestId,
        };
        
        return { success: true, data: apiResponse };
      }

      // Return offline error if no cache available
      return {
        success: false,
        error: {
          code: 'OFFLINE_NO_CACHE',
          message: 'Request queued for when online. No cached data available.',
          details: {
            queuedActionId: offlineAction.id,
            willRetryWhenOnline: true,
          },
        },
      };
    } catch (error) {
      logger.error('Offline request handling failed', { error, requestId });
      return {
        success: false,
        error: {
          code: 'OFFLINE_HANDLING_FAILED',
          message: 'Failed to handle offline request',
          details: error,
        },
      };
    }
  }

  /**
   * Queue request when at concurrency limit
   */
  private async queueRequest<T>(
    config: ApiRequestConfig,
    requestId: string
  ): Promise<Result<ApiResponse<T>>> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        const result = await this.executeRequest<T>(config, requestId);
        resolve(result);
      });
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  /**
   * Prepare request headers with authentication
   */
  private async prepareHeaders(config: ApiRequestConfig): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': await this.getUserAgent(),
      'X-App-Version': Environment.appVersion,
      'X-Platform': Platform.OS,
      ...config.headers,
    };

    // Add authentication header if required
    if (config.requiresAuth !== false) {
      const sessionResult = await secureStorageService.getSessionData();
      if (sessionResult.success && sessionResult.data) {
        headers['Authorization'] = `Bearer ${sessionResult.data.accessToken}`;
      }
    }

    return headers;
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = !!state.isConnected;
      
      logger.info('Network status changed', { 
        isOnline: this.isOnline,
        type: state.type,
        wasOnline,
      });

      // Trigger sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.onNetworkReconnected();
      }
    });
  }

  /**
   * Handle network reconnection
   */
  private async onNetworkReconnected(): Promise<void> {
    try {
      logger.info('Network reconnected, processing offline queue');
      
      // Process offline actions
      const actionsResult = await offlineStorageService.getQueuedActions();
      if (actionsResult.success && actionsResult.data.length > 0) {
        await this.processOfflineActions(actionsResult.data);
      }
    } catch (error) {
      logger.error('Failed to process offline queue on reconnection', { error });
    }
  }

  /**
   * Process queued offline actions
   */
  private async processOfflineActions(actions: OfflineAction[]): Promise<void> {
    // Sort by priority and timestamp
    const sortedActions = actions.sort((a, b) => {
      const priorityOrder = { critical: 1, high: 2, normal: 3, low: 4 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    for (const action of sortedActions) {
      try {
        const config: ApiRequestConfig = {
          method: action.data.method,
          url: action.data.url,
          data: action.data.body,
          headers: action.data.headers,
          requiresAuth: true,
          priority: action.priority,
        };

        const result = await this.executeRequest(config, action.id);
        
        if (result.success) {
          // Remove from offline queue
          await offlineStorageService.removeAction(action.id);
          logger.info('Offline action processed successfully', { actionId: action.id });
        } else {
          // Increment retry count
          await offlineStorageService.incrementRetryCount(action.id);
          logger.warn('Offline action failed, will retry', { 
            actionId: action.id, 
            retryCount: action.retryCount + 1 
          });
        }
      } catch (error) {
        logger.error('Failed to process offline action', { 
          actionId: action.id, 
          error 
        });
      }
    }
  }

  // Helper methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserAgent(): Promise<string> {
    const deviceInfo = await DeviceInfo.getDeviceName();
    const appVersion = Environment.appVersion;
    const platform = Platform.OS;
    
    return `AppBoardGuru-Mobile/${appVersion} (${platform}; ${deviceInfo})`;
  }

  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = OFFLINE.INITIAL_RETRY_DELAY;
    const multiplier = OFFLINE.RETRY_BACKOFF_MULTIPLIER;
    return Math.min(baseDelay * Math.pow(multiplier, attempt - 1), 30000); // Max 30s
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isNetworkError(error: any): boolean {
    return (
      error.name === 'NetworkError' ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('network') ||
      error.message?.includes('fetch')
    );
  }

  private getErrorCode(error: any): string {
    if (this.isNetworkError(error)) return 'NETWORK_ERROR';
    if (error.name === 'AbortError') return 'TIMEOUT_ERROR';
    if (error.name === 'TypeError') return 'REQUEST_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private mapRequestToActionType(config: ApiRequestConfig): OfflineAction['type'] {
    const { method, url } = config;
    
    if (url.includes('/assets')) {
      if (method === 'POST') return 'create_asset';
      if (method === 'PUT' || method === 'PATCH') return 'update_asset';
      if (method === 'DELETE') return 'delete_asset';
    }
    
    if (url.includes('/annotations')) {
      if (method === 'POST') return 'create_annotation';
      if (method === 'PUT' || method === 'PATCH') return 'update_annotation';
    }
    
    if (url.includes('/votes')) {
      return 'submit_vote';
    }
    
    if (url.includes('/meetings')) {
      if (method === 'POST') return 'create_meeting';
      if (method === 'PUT' || method === 'PATCH') return 'update_meeting';
    }
    
    if (url.includes('/notifications')) {
      return 'mark_notification_read';
    }
    
    if (url.includes('/profile')) {
      return 'update_profile';
    }
    
    return 'sync_documents';
  }
}

export const mobileApiClient = new MobileApiClient();