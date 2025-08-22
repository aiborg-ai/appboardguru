/**
 * Database Error Handler
 * Centralized error handling, logging, and monitoring for database operations
 */

export interface DatabaseOperationContext {
  operation: string
  table?: string
  userId?: string
  organizationId?: string
  requestId?: string
  metadata?: Record<string, any>
}

export interface DatabaseErrorDetails {
  code: string
  message: string
  hint?: string
  details?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'connection' | 'validation' | 'constraint' | 'permission' | 'performance' | 'unknown'
  retryable: boolean
  userFriendlyMessage: string
  suggestedAction: string
}

export interface DatabaseAlert {
  id: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  message: string
  context: DatabaseOperationContext
  details: DatabaseErrorDetails
  shouldNotify: boolean
  alertChannels: string[]
}

/**
 * Enhanced Database Error Handler
 */
export class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler
  private errorCounts = new Map<string, number>()
  private lastErrorTimes = new Map<string, number>()
  private performanceMetrics = new Map<string, number[]>()

  private constructor() {}

  static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler()
    }
    return DatabaseErrorHandler.instance
  }

  /**
   * Handle and categorize database errors
   */
  handleDatabaseError(
    error: any,
    context: DatabaseOperationContext
  ): DatabaseErrorDetails {
    const errorDetails = this.analyzeDatabaseError(error)
    
    // Log the error with context
    this.logError(error, context, errorDetails)
    
    // Track error patterns
    this.trackErrorPattern(errorDetails.code, context)
    
    // Generate alerts if necessary
    this.generateAlertIfNeeded(error, context, errorDetails)
    
    return errorDetails
  }

  /**
   * Analyze and categorize database errors
   */
  private analyzeDatabaseError(error: any): DatabaseErrorDetails {
    const errorCode = error?.code || 'UNKNOWN_ERROR'
    const errorMessage = error?.message || 'An unknown database error occurred'

    // PostgreSQL error code mapping
    const errorMappings: Record<string, Partial<DatabaseErrorDetails>> = {
      // Connection errors
      '08000': {
        severity: 'critical',
        category: 'connection',
        retryable: true,
        userFriendlyMessage: 'Database connection failed',
        suggestedAction: 'Please try again. If the problem persists, contact support.'
      },
      '08003': {
        severity: 'high',
        category: 'connection',
        retryable: true,
        userFriendlyMessage: 'Connection does not exist',
        suggestedAction: 'Please refresh the page and try again.'
      },
      '08006': {
        severity: 'critical',
        category: 'connection',
        retryable: true,
        userFriendlyMessage: 'Connection failure',
        suggestedAction: 'Please check your internet connection and try again.'
      },

      // Constraint violations
      '23505': {
        severity: 'medium',
        category: 'constraint',
        retryable: false,
        userFriendlyMessage: 'A record with this information already exists',
        suggestedAction: 'Please modify your input to use unique values.'
      },
      '23503': {
        severity: 'medium',
        category: 'constraint',
        retryable: false,
        userFriendlyMessage: 'Referenced record does not exist',
        suggestedAction: 'Please ensure all referenced data exists and try again.'
      },
      '23514': {
        severity: 'medium',
        category: 'validation',
        retryable: false,
        userFriendlyMessage: 'Input validation failed',
        suggestedAction: 'Please check your input and ensure it meets the requirements.'
      },

      // Permission errors
      '42501': {
        severity: 'high',
        category: 'permission',
        retryable: false,
        userFriendlyMessage: 'Access denied',
        suggestedAction: 'You do not have permission to perform this action.'
      },

      // Performance issues
      '57014': {
        severity: 'high',
        category: 'performance',
        retryable: true,
        userFriendlyMessage: 'Operation timed out',
        suggestedAction: 'The operation took too long. Please try again with simpler criteria.'
      },

      // Data errors
      '22001': {
        severity: 'medium',
        category: 'validation',
        retryable: false,
        userFriendlyMessage: 'Data too long',
        suggestedAction: 'Please reduce the length of your input.'
      },
      '22008': {
        severity: 'medium',
        category: 'validation',
        retryable: false,
        userFriendlyMessage: 'Invalid date/time format',
        suggestedAction: 'Please provide a valid date and time.'
      }
    }

    // Check for Supabase-specific errors
    const supabaseErrorMappings: Record<string, Partial<DatabaseErrorDetails>> = {
      'PGRST116': {
        severity: 'low',
        category: 'validation',
        retryable: false,
        userFriendlyMessage: 'Record not found',
        suggestedAction: 'The requested record does not exist or you do not have access to it.'
      },
      'PGRST100': {
        severity: 'medium',
        category: 'validation',
        retryable: false,
        userFriendlyMessage: 'Invalid query parameters',
        suggestedAction: 'Please check your request parameters and try again.'
      }
    }

    // Get base error details
    const baseDetails = errorMappings[errorCode] || supabaseErrorMappings[errorCode] || {
      severity: 'medium' as const,
      category: 'unknown' as const,
      retryable: false,
      userFriendlyMessage: 'A database error occurred',
      suggestedAction: 'Please try again or contact support if the problem persists.'
    }

    return {
      code: errorCode,
      message: errorMessage,
      hint: error?.hint,
      details: error?.details,
      ...baseDetails
    }
  }

  /**
   * Log database errors with appropriate detail level
   */
  private logError(
    error: any,
    context: DatabaseOperationContext,
    details: DatabaseErrorDetails
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(details.severity),
      category: 'database_error',
      error: {
        code: details.code,
        message: details.message,
        hint: details.hint,
        details: details.details
      },
      context,
      analysis: {
        severity: details.severity,
        category: details.category,
        retryable: details.retryable
      },
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }

    // Log based on severity
    switch (details.severity) {
      case 'critical':
        console.error('🚨 CRITICAL Database Error:', logEntry)
        break
      case 'high':
        console.error('❌ High Severity Database Error:', logEntry)
        break
      case 'medium':
        console.warn('⚠️ Medium Severity Database Error:', logEntry)
        break
      case 'low':
        console.log('ℹ️ Low Severity Database Error:', logEntry)
        break
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(logEntry)
    }
  }

  /**
   * Track error patterns for monitoring
   */
  private trackErrorPattern(errorCode: string, context: DatabaseOperationContext): void {
    const key = `${errorCode}:${context.operation}`
    const now = Date.now()

    // Count occurrences
    const currentCount = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, currentCount + 1)

    // Track timing
    this.lastErrorTimes.set(key, now)

    // Clean up old entries (keep last 1 hour)
    const oneHourAgo = now - 3600000
    for (const [k, time] of this.lastErrorTimes.entries()) {
      if (time < oneHourAgo) {
        this.lastErrorTimes.delete(k)
        this.errorCounts.delete(k)
      }
    }
  }

  /**
   * Generate alerts for critical errors or patterns
   */
  private generateAlertIfNeeded(
    error: any,
    context: DatabaseOperationContext,
    details: DatabaseErrorDetails
  ): void {
    const shouldAlert = this.shouldGenerateAlert(details, context)
    
    if (shouldAlert) {
      const alert: DatabaseAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        severity: details.severity,
        category: details.category,
        message: `Database ${details.category} error: ${details.message}`,
        context,
        details,
        shouldNotify: details.severity === 'critical',
        alertChannels: this.getAlertChannels(details.severity)
      }

      console.log('🔔 Database Alert Generated:', alert)

      // Send alert to monitoring systems
      if (process.env.NODE_ENV === 'production') {
        this.sendAlert(alert)
      }
    }
  }

  /**
   * Determine if an alert should be generated
   */
  private shouldGenerateAlert(details: DatabaseErrorDetails, context: DatabaseOperationContext): boolean {
    // Always alert on critical errors
    if (details.severity === 'critical') {
      return true
    }

    // Alert on high severity errors in production operations
    if (details.severity === 'high' && context.operation.includes('create')) {
      return true
    }

    // Alert on error patterns (multiple similar errors)
    const key = `${details.code}:${context.operation}`
    const errorCount = this.errorCounts.get(key) || 0
    
    if (errorCount > 5) { // More than 5 similar errors
      return true
    }

    // Alert on connection issues
    if (details.category === 'connection') {
      return true
    }

    return false
  }

  /**
   * Get appropriate log level for severity
   */
  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'error'
      case 'high': return 'error'
      case 'medium': return 'warn'
      case 'low': return 'info'
      default: return 'warn'
    }
  }

  /**
   * Get alert channels based on severity
   */
  private getAlertChannels(severity: string): string[] {
    switch (severity) {
      case 'critical':
        return ['email', 'sms', 'slack', 'pagerduty']
      case 'high':
        return ['email', 'slack']
      case 'medium':
        return ['slack']
      case 'low':
        return ['log']
      default:
        return ['log']
    }
  }

  /**
   * Send error to external logging service
   */
  private async sendToLoggingService(logEntry: any): Promise<void> {
    // Implement integration with logging services like:
    // - Datadog
    // - New Relic
    // - CloudWatch
    // - Sentry
    
    try {
      // Example implementation would go here
      console.log('📤 Sending to logging service:', logEntry)
    } catch (error) {
      console.error('Failed to send log to external service:', error)
    }
  }

  /**
   * Send alert to monitoring systems
   */
  private async sendAlert(alert: DatabaseAlert): Promise<void> {
    try {
      for (const channel of alert.alertChannels) {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert)
            break
          case 'slack':
            await this.sendSlackAlert(alert)
            break
          case 'sms':
            await this.sendSMSAlert(alert)
            break
          case 'pagerduty':
            await this.sendPagerDutyAlert(alert)
            break
        }
      }
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  /**
   * Performance monitoring
   */
  recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, [])
    }
    
    const metrics = this.performanceMetrics.get(operation)!
    metrics.push(duration)
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    // Alert on performance degradation
    if (metrics.length >= 10) {
      const avgDuration = metrics.reduce((sum, d) => sum + d, 0) / metrics.length
      const recentAvg = metrics.slice(-5).reduce((sum, d) => sum + d, 0) / 5
      
      // Alert if recent operations are 50% slower than average
      if (recentAvg > avgDuration * 1.5 && avgDuration > 1000) {
        console.warn(`⚠️ Performance degradation detected for ${operation}: ${recentAvg}ms vs ${avgDuration}ms average`)
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, any> {
    const stats = {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType: Object.fromEntries(this.errorCounts.entries()),
      performanceMetrics: Object.fromEntries(
        Array.from(this.performanceMetrics.entries()).map(([op, durations]) => [
          op,
          {
            count: durations.length,
            average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations)
          }
        ])
      ),
      lastUpdated: new Date().toISOString()
    }

    return stats
  }

  // Placeholder alert methods (implement based on your infrastructure)
  private async sendEmailAlert(alert: DatabaseAlert): Promise<void> {
    console.log('📧 Email alert would be sent:', alert)
  }

  private async sendSlackAlert(alert: DatabaseAlert): Promise<void> {
    console.log('📱 Slack alert would be sent:', alert)
  }

  private async sendSMSAlert(alert: DatabaseAlert): Promise<void> {
    console.log('📱 SMS alert would be sent:', alert)
  }

  private async sendPagerDutyAlert(alert: DatabaseAlert): Promise<void> {
    console.log('📟 PagerDuty alert would be sent:', alert)
  }
}

// Singleton instance
export const databaseErrorHandler = DatabaseErrorHandler.getInstance()

/**
 * Utility function to handle database errors consistently
 */
export function handleDatabaseError(
  error: any,
  context: DatabaseOperationContext
): never {
  const errorDetails = databaseErrorHandler.handleDatabaseError(error, context)
  
  // Create user-friendly error
  const userError = new Error(errorDetails.userFriendlyMessage)
  ;(userError as any).code = errorDetails.code
  ;(userError as any).suggestion = errorDetails.suggestedAction
  ;(userError as any).retryable = errorDetails.retryable
  
  throw userError
}

/**
 * Decorator for database operations with error handling
 */
export function withDatabaseErrorHandling(
  operation: string,
  context?: Partial<DatabaseOperationContext>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const fullContext: DatabaseOperationContext = {
        operation: `${target.constructor.name}.${propertyName}`,
        ...context
      }

      const startTime = Date.now()

      try {
        const result = await method.apply(this, args)
        
        // Record performance
        const duration = Date.now() - startTime
        databaseErrorHandler.recordPerformanceMetric(fullContext.operation, duration)
        
        return result
      } catch (error) {
        handleDatabaseError(error, fullContext)
      }
    }
  }
}