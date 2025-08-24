/**
 * Advanced Error Handling System
 * - Hierarchical error classification with context preservation
 * - Intelligent error recovery strategies
 * - Performance-aware error tracking
 * - Integration with monitoring systems
 */

import { RepositoryError, ErrorCode, ErrorCategory } from '../repositories/result'

// Enhanced error types
export interface ErrorContext {
  userId?: string
  organizationId?: string
  sessionId?: string
  requestId?: string
  component?: string
  operation?: string
  timestamp: number
  userAgent?: string
  url?: string
  stack?: string
  breadcrumbs?: ErrorBreadcrumb[]
  tags?: Record<string, string>
  extra?: Record<string, any>
}

export interface ErrorBreadcrumb {
  timestamp: number
  category: 'navigation' | 'user' | 'http' | 'error' | 'info'
  message: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  data?: Record<string, any>
}

export interface ErrorMetrics {
  count: number
  firstSeen: number
  lastSeen: number
  frequency: number
  affectedUsers: Set<string>
  resolvedCount: number
  fingerprint: string
}

export interface RecoveryStrategy {
  name: string
  canRecover: (error: EnhancedError) => boolean
  recover: (error: EnhancedError, context: ErrorContext) => Promise<RecoveryResult>
  priority: number
}

export interface RecoveryResult {
  success: boolean
  action: 'retry' | 'fallback' | 'ignore' | 'escalate'
  data?: any
  message?: string
  delay?: number
}

// Enhanced error class with recovery and context
export class EnhancedError extends Error {
  public readonly id: string
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  public readonly isRecoverable: boolean
  public readonly context: ErrorContext
  public readonly originalError?: Error
  public readonly fingerprint: string
  public recoveryAttempts: number = 0
  public readonly createdAt: number
  public resolvedAt?: number

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = 'operational',
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical'
      isRecoverable?: boolean
      context?: Partial<ErrorContext>
      originalError?: Error
      cause?: Error
    } = {}
  ) {
    super(message, { cause: options.cause })
    
    this.name = 'EnhancedError'
    this.id = generateErrorId()
    this.code = code
    this.category = category
    this.severity = options.severity || this.inferSeverity(code, category)
    this.isRecoverable = options.isRecoverable ?? this.inferRecoverability(code, category)
    this.originalError = options.originalError
    this.createdAt = Date.now()
    
    // Build comprehensive context
    this.context = {
      timestamp: this.createdAt,
      stack: this.stack,
      ...this.buildDefaultContext(),
      ...options.context
    }
    
    // Generate fingerprint for error grouping
    this.fingerprint = this.generateFingerprint()
    
    // Preserve stack trace
    Error.captureStackTrace?.(this, EnhancedError)
  }

  private inferSeverity(code: string, category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
    if (category === 'security') return 'critical'
    if (category === 'system') return 'high'
    if (code.includes('TIMEOUT') || code.includes('NETWORK')) return 'medium'
    return 'low'
  }

  private inferRecoverability(code: string, category: ErrorCategory): boolean {
    if (category === 'security') return false
    if (category === 'validation') return false
    if (code.includes('TIMEOUT') || code.includes('NETWORK')) return true
    if (code.includes('SERVICE_UNAVAILABLE')) return true
    return true
  }

  private buildDefaultContext(): Partial<ErrorContext> {
    const context: Partial<ErrorContext> = {}
    
    if (typeof window !== 'undefined') {
      context.userAgent = navigator.userAgent
      context.url = window.location.href
    }
    
    return context
  }

  private generateFingerprint(): string {
    const components = [
      this.name,
      this.code,
      this.category,
      this.context.component,
      this.context.operation,
      // Use first few lines of stack for grouping similar errors
      this.stack?.split('\n').slice(0, 3).join('|')
    ].filter(Boolean)
    
    return btoa(components.join('::')).slice(0, 16)
  }

  public addContext(additionalContext: Partial<ErrorContext>): void {
    Object.assign(this.context, additionalContext)
  }

  public addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    if (!this.context.breadcrumbs) {
      this.context.breadcrumbs = []
    }
    this.context.breadcrumbs.push(breadcrumb)
    
    // Keep only last 50 breadcrumbs
    if (this.context.breadcrumbs.length > 50) {
      this.context.breadcrumbs = this.context.breadcrumbs.slice(-50)
    }
  }

  public markResolved(): void {
    this.resolvedAt = Date.now()
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      isRecoverable: this.isRecoverable,
      context: this.context,
      fingerprint: this.fingerprint,
      recoveryAttempts: this.recoveryAttempts,
      createdAt: this.createdAt,
      resolvedAt: this.resolvedAt,
      stack: this.stack
    }
  }
}

// Advanced Error Handler with recovery strategies
export class AdvancedErrorHandler {
  private static instance: AdvancedErrorHandler
  private errorMetrics = new Map<string, ErrorMetrics>()
  private recoveryStrategies: RecoveryStrategy[] = []
  private errorQueue: EnhancedError[] = []
  private breadcrumbs: ErrorBreadcrumb[] = []
  private isProcessing = false
  private subscribers: Array<(error: EnhancedError) => void> = []

  private constructor() {
    this.setupDefaultRecoveryStrategies()
    this.setupGlobalErrorHandlers()
    this.startErrorProcessor()
  }

  public static getInstance(): AdvancedErrorHandler {
    if (!AdvancedErrorHandler.instance) {
      AdvancedErrorHandler.instance = new AdvancedErrorHandler()
    }
    return AdvancedErrorHandler.instance
  }

  /**
   * Handle error with advanced recovery and logging
   */
  public async handleError(
    error: Error | EnhancedError,
    context?: Partial<ErrorContext>
  ): Promise<RecoveryResult | null> {
    const enhancedError = this.enhanceError(error, context)
    
    // Add current breadcrumbs to error context
    enhancedError.context.breadcrumbs = [...this.breadcrumbs, ...(enhancedError.context.breadcrumbs || [])]
    
    // Track error metrics
    this.trackErrorMetrics(enhancedError)
    
    // Queue for async processing
    this.errorQueue.push(enhancedError)
    
    // Notify subscribers
    this.notifySubscribers(enhancedError)
    
    // Attempt recovery if error is recoverable
    if (enhancedError.isRecoverable) {
      return this.attemptRecovery(enhancedError)
    }
    
    return null
  }

  /**
   * Add breadcrumb for error context
   */
  public addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: ErrorBreadcrumb = {
      timestamp: Date.now(),
      ...breadcrumb
    }
    
    this.breadcrumbs.push(fullBreadcrumb)
    
    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100)
    }
  }

  /**
   * Register recovery strategy
   */
  public registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy)
    // Sort by priority (higher priority first)
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Subscribe to error events
   */
  public subscribe(callback: (error: EnhancedError) => void): () => void {
    this.subscribers.push(callback)
    
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  /**
   * Get error metrics and analytics
   */
  public getErrorMetrics(): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<string, number>
    topErrors: Array<{ fingerprint: string; count: number; lastSeen: number }>
    recoveryStats: { attempted: number; successful: number; rate: number }
  } {
    const totalErrors = Array.from(this.errorMetrics.values())
      .reduce((sum, metrics) => sum + metrics.count, 0)
    
    const errorsByCategory: Record<ErrorCategory, number> = {
      validation: 0,
      business: 0,
      operational: 0,
      system: 0,
      security: 0,
      network: 0
    }
    
    const errorsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
    
    let recoveryAttempted = 0
    let recoverySuccessful = 0
    
    // Process all errors in queue for statistics
    for (const error of this.errorQueue) {
      errorsByCategory[error.category]++
      errorsBySeverity[error.severity]++
      
      if (error.recoveryAttempts > 0) {
        recoveryAttempted++
        if (error.resolvedAt) {
          recoverySuccessful++
        }
      }
    }
    
    const topErrors = Array.from(this.errorMetrics.entries())
      .map(([fingerprint, metrics]) => ({
        fingerprint,
        count: metrics.count,
        lastSeen: metrics.lastSeen
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      recoveryStats: {
        attempted: recoveryAttempted,
        successful: recoverySuccessful,
        rate: recoveryAttempted > 0 ? (recoverySuccessful / recoveryAttempted) * 100 : 0
      }
    }
  }

  /**
   * Clear old errors and metrics
   */
  public clearOldErrors(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    
    // Clear old errors from queue
    this.errorQueue = this.errorQueue.filter(error => error.createdAt > cutoff)
    
    // Clear old breadcrumbs
    this.breadcrumbs = this.breadcrumbs.filter(breadcrumb => breadcrumb.timestamp > cutoff)
    
    // Clear old metrics
    for (const [fingerprint, metrics] of this.errorMetrics.entries()) {
      if (metrics.lastSeen < cutoff) {
        this.errorMetrics.delete(fingerprint)
      }
    }
  }

  // Private methods
  private enhanceError(error: Error | EnhancedError, context?: Partial<ErrorContext>): EnhancedError {
    if (error instanceof EnhancedError) {
      if (context) {
        error.addContext(context)
      }
      return error
    }
    
    // Convert regular error to enhanced error
    if (error instanceof RepositoryError) {
      return new EnhancedError(
        error.message,
        error.code,
        error.category,
        {
          severity: error.severity,
          isRecoverable: error.recoverable,
          context: { ...error.details, ...context },
          originalError: error
        }
      )
    }
    
    // Handle generic errors
    return new EnhancedError(
      error.message,
      'UNKNOWN_ERROR',
      'operational',
      {
        context,
        originalError: error
      }
    )
  }

  private trackErrorMetrics(error: EnhancedError): void {
    const { fingerprint } = error
    
    if (!this.errorMetrics.has(fingerprint)) {
      this.errorMetrics.set(fingerprint, {
        count: 0,
        firstSeen: error.createdAt,
        lastSeen: error.createdAt,
        frequency: 0,
        affectedUsers: new Set(),
        resolvedCount: 0,
        fingerprint
      })
    }
    
    const metrics = this.errorMetrics.get(fingerprint)!
    metrics.count++
    metrics.lastSeen = error.createdAt
    metrics.frequency = metrics.count / ((metrics.lastSeen - metrics.firstSeen) / (1000 * 60)) // errors per minute
    
    if (error.context.userId) {
      metrics.affectedUsers.add(error.context.userId)
    }
  }

  private async attemptRecovery(error: EnhancedError): Promise<RecoveryResult | null> {
    error.recoveryAttempts++
    
    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies.filter(strategy => 
      strategy.canRecover(error)
    )
    
    if (applicableStrategies.length === 0) {
      return null
    }
    
    // Try recovery strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        const result = await strategy.recover(error, error.context)
        
        if (result.success) {
          error.markResolved()
          const metrics = this.errorMetrics.get(error.fingerprint)
          if (metrics) {
            metrics.resolvedCount++
          }
          return result
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy '${strategy.name}' failed:`, recoveryError)
      }
    }
    
    return null
  }

  private setupDefaultRecoveryStrategies(): void {
    // Network timeout recovery
    this.registerRecoveryStrategy({
      name: 'NetworkTimeoutRetry',
      priority: 8,
      canRecover: (error) => 
        error.code.includes('TIMEOUT') || error.code.includes('NETWORK_ERROR'),
      recover: async (error) => {
        if (error.recoveryAttempts >= 3) {
          return { success: false, action: 'escalate' }
        }
        
        const delay = Math.pow(2, error.recoveryAttempts) * 1000
        return { 
          success: true, 
          action: 'retry', 
          delay,
          message: `Retrying after network timeout (attempt ${error.recoveryAttempts})`
        }
      }
    })

    // Service unavailable recovery
    this.registerRecoveryStrategy({
      name: 'ServiceUnavailableRetry',
      priority: 7,
      canRecover: (error) => 
        error.code === 'SERVICE_UNAVAILABLE' || error.code.includes('503'),
      recover: async (error) => {
        if (error.recoveryAttempts >= 5) {
          return { success: false, action: 'fallback' }
        }
        
        const delay = Math.pow(2, error.recoveryAttempts) * 2000
        return { 
          success: true, 
          action: 'retry', 
          delay,
          message: `Service unavailable, retrying (attempt ${error.recoveryAttempts})`
        }
      }
    })

    // Cache fallback recovery
    this.registerRecoveryStrategy({
      name: 'CacheFallback',
      priority: 5,
      canRecover: (error) => 
        error.category === 'network' && error.context.operation?.includes('fetch'),
      recover: async (error) => {
        // Try to get data from cache
        return { 
          success: true, 
          action: 'fallback', 
          message: 'Using cached data due to network error'
        }
      }
    })

    // User notification recovery
    this.registerRecoveryStrategy({
      name: 'UserNotification',
      priority: 2,
      canRecover: (error) => error.severity === 'high' || error.severity === 'critical',
      recover: async (error) => {
        // Show user notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification('Application Error', {
            body: 'An error occurred. We\'re working to fix it.',
            icon: '/error-icon.png'
          })
        }
        
        return { 
          success: true, 
          action: 'ignore',
          message: 'User notified of error'
        }
      }
    })
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.addBreadcrumb({
          category: 'error',
          level: 'error',
          message: 'Unhandled promise rejection',
          data: { reason: event.reason }
        })
        
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason))
        
        this.handleError(error, {
          component: 'global',
          operation: 'unhandledRejection'
        })
      })

      // Handle global errors
      window.addEventListener('error', (event) => {
        this.addBreadcrumb({
          category: 'error',
          level: 'error',
          message: 'Global JavaScript error',
          data: { 
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        })
        
        this.handleError(event.error || new Error(event.message), {
          component: 'global',
          operation: 'globalError',
          url: event.filename
        })
      })
    }
  }

  private startErrorProcessor(): void {
    // Process errors in batches to avoid overwhelming external services
    setInterval(() => {
      if (this.isProcessing || this.errorQueue.length === 0) return
      
      this.processErrorBatch()
    }, 5000) // Process every 5 seconds
  }

  private async processErrorBatch(): Promise<void> {
    this.isProcessing = true
    
    try {
      const batch = this.errorQueue.splice(0, 10) // Process up to 10 errors at once
      
      for (const error of batch) {
        // Send to external monitoring service
        await this.sendToMonitoring(error)
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          this.logError(error)
        }
      }
    } catch (processingError) {
      console.error('Error processing error batch:', processingError)
    } finally {
      this.isProcessing = false
    }
  }

  private async sendToMonitoring(error: EnhancedError): Promise<void> {
    // Integration point for external monitoring services
    // (Sentry, DataDog, New Relic, etc.)
    
    try {
      // Example: Send to monitoring service
      if (process.env.MONITORING_ENABLED === 'true') {
        // await monitoringService.captureError(error)
      }
    } catch (monitoringError) {
      console.warn('Failed to send error to monitoring:', monitoringError)
    }
  }

  private logError(error: EnhancedError): void {
    const logLevel = error.severity === 'critical' ? 'error' : 
                     error.severity === 'high' ? 'error' :
                     error.severity === 'medium' ? 'warn' : 'info'
    
    console.group(`🚨 ${error.severity.toUpperCase()} ERROR: ${error.code}`)
    console[logLevel]('Message:', error.message)
    console[logLevel]('ID:', error.id)
    console[logLevel]('Category:', error.category)
    console[logLevel]('Fingerprint:', error.fingerprint)
    console[logLevel]('Context:', error.context)
    console[logLevel]('Recovery attempts:', error.recoveryAttempts)
    
    if (error.context.breadcrumbs && error.context.breadcrumbs.length > 0) {
      console.group('Breadcrumbs:')
      error.context.breadcrumbs.slice(-5).forEach(breadcrumb => {
        console.log(`[${breadcrumb.level}] ${breadcrumb.message}`, breadcrumb.data)
      })
      console.groupEnd()
    }
    
    if (error.stack) {
      console[logLevel]('Stack trace:', error.stack)
    }
    
    console.groupEnd()
  }

  private notifySubscribers(error: EnhancedError): void {
    this.subscribers.forEach(callback => {
      try {
        callback(error)
      } catch (subscriberError) {
        console.warn('Error subscriber failed:', subscriberError)
      }
    })
  }
}

// Utility functions
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Singleton instance
export const errorHandler = AdvancedErrorHandler.getInstance()

// Convenience functions
export function handleError(error: Error, context?: Partial<ErrorContext>): Promise<RecoveryResult | null> {
  return errorHandler.handleError(error, context)
}

export function addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
  errorHandler.addBreadcrumb(breadcrumb)
}

export function createError(
  message: string,
  code: string,
  category?: ErrorCategory,
  options?: Parameters<typeof EnhancedError.prototype.constructor>[3]
): EnhancedError {
  return new EnhancedError(message, code, category, options)
}