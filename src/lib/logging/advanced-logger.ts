/**
 * Advanced Logging System
 * - Structured logging with multiple output formats
 * - Performance-aware log processing
 * - Context-aware logging with correlation IDs
 * - Integration with monitoring and analytics
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context: LogContext
  tags?: string[]
  extra?: Record<string, any>
  duration?: number
  fingerprint?: string
}

export interface LogContext {
  correlationId?: string
  userId?: string
  organizationId?: string
  sessionId?: string
  requestId?: string
  component?: string
  operation?: string
  userAgent?: string
  ip?: string
  url?: string
  method?: string
  statusCode?: number
  version?: string
  environment?: string
}

export interface LogTransport {
  name: string
  level: LogLevel
  format: LogFormat
  enabled: boolean
  transport: (entry: LogEntry) => Promise<void> | void
  filter?: (entry: LogEntry) => boolean
  bufferSize?: number
  flushInterval?: number
}

export type LogFormat = 'json' | 'text' | 'structured' | 'minimal'

export interface LoggerConfig {
  level: LogLevel
  transports: LogTransport[]
  context?: Partial<LogContext>
  enablePerformanceTracking?: boolean
  enableCorrelationId?: boolean
  maxBufferSize?: number
  flushInterval?: number
}

export interface PerformanceMetrics {
  operationCount: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  p99Duration: number
  errorRate: number
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
}

export class AdvancedLogger {
  private static instances = new Map<string, AdvancedLogger>()
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private performanceMetrics = new Map<string, PerformanceMetrics>()
  private activeOperations = new Map<string, number>()
  private flushTimer?: NodeJS.Timeout

  constructor(name: string, config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      transports: [this.createConsoleTransport()],
      enablePerformanceTracking: true,
      enableCorrelationId: true,
      maxBufferSize: 1000,
      flushInterval: 5000,
      ...config
    }

    this.setupDefaultContext()
    this.startPeriodicFlush()
  }

  /**
   * Get or create logger instance
   */
  public static getLogger(name: string = 'default', config?: Partial<LoggerConfig>): AdvancedLogger {
    if (!AdvancedLogger.instances.has(name)) {
      AdvancedLogger.instances.set(name, new AdvancedLogger(name, config))
    }
    return AdvancedLogger.instances.get(name)!
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Partial<LogContext>, extra?: Record<string, any>): void {
    this.log('debug', message, context, extra)
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Partial<LogContext>, extra?: Record<string, any>): void {
    this.log('info', message, context, extra)
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Partial<LogContext>, extra?: Record<string, any>): void {
    this.log('warn', message, context, extra)
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: Partial<LogContext>, extra?: Record<string, any>): void {
    const enhancedContext = { ...context }
    const enhancedExtra = { ...extra }

    if (error) {
      enhancedExtra.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    }

    this.log('error', message, enhancedContext, enhancedExtra)
  }

  /**
   * Log fatal error message
   */
  public fatal(message: string, error?: Error, context?: Partial<LogContext>, extra?: Record<string, any>): void {
    const enhancedContext = { ...context }
    const enhancedExtra = { ...extra }

    if (error) {
      enhancedExtra.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    }

    this.log('fatal', message, enhancedContext, enhancedExtra)
  }

  /**
   * Start performance tracking for an operation
   */
  public startOperation(operationId: string, operation: string, context?: Partial<LogContext>): void {
    if (!this.config.enablePerformanceTracking) return

    this.activeOperations.set(operationId, Date.now())
    
    this.debug(`Operation started: ${operation}`, {
      ...context,
      operation,
      operationId
    })
  }

  /**
   * End performance tracking for an operation
   */
  public endOperation(
    operationId: string, 
    operation: string, 
    success: boolean = true,
    context?: Partial<LogContext>,
    extra?: Record<string, any>
  ): number {
    if (!this.config.enablePerformanceTracking) return 0

    const startTime = this.activeOperations.get(operationId)
    if (!startTime) {
      this.warn('Operation end called without start', { operationId, operation })
      return 0
    }

    const duration = Date.now() - startTime
    this.activeOperations.delete(operationId)

    // Update performance metrics
    this.updatePerformanceMetrics(operation, duration, success)

    // Log operation completion
    const level = success ? 'info' : 'warn'
    this.log(level, `Operation ${success ? 'completed' : 'failed'}: ${operation}`, {
      ...context,
      operation,
      operationId
    }, {
      ...extra,
      duration,
      success
    })

    return duration
  }

  /**
   * Time an operation with automatic logging
   */
  public async time<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: Partial<LogContext>
  ): Promise<T> {
    const operationId = this.generateOperationId()
    
    this.startOperation(operationId, operation, context)
    
    try {
      const result = await fn()
      this.endOperation(operationId, operation, true, context, { result: typeof result })
      return result
    } catch (error) {
      this.endOperation(operationId, operation, false, context, { error })
      throw error
    }
  }

  /**
   * Create child logger with inherited context
   */
  public child(context: Partial<LogContext>): AdvancedLogger {
    const childConfig = {
      ...this.config,
      context: {
        ...this.config.context,
        ...context
      }
    }

    return new AdvancedLogger(`${this.constructor.name}.child`, childConfig)
  }

  /**
   * Add custom transport
   */
  public addTransport(transport: LogTransport): void {
    this.config.transports.push(transport)
  }

  /**
   * Remove transport by name
   */
  public removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(t => t.name !== name)
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Update logger context
   */
  public setContext(context: Partial<LogContext>): void {
    this.config.context = {
      ...this.config.context,
      ...context
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(operation?: string): PerformanceMetrics | Record<string, PerformanceMetrics> {
    if (operation) {
      return this.performanceMetrics.get(operation) || {
        operationCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0
      }
    }

    return Object.fromEntries(this.performanceMetrics.entries())
  }

  /**
   * Flush all pending logs
   */
  public async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const entries = [...this.logBuffer]
    this.logBuffer.length = 0

    await Promise.all(
      entries.map(entry =>
        Promise.all(
          this.config.transports.map(transport =>
            this.sendToTransport(transport, entry).catch(error =>
              console.error(`Transport ${transport.name} failed:`, error)
            )
          )
        )
      )
    )
  }

  /**
   * Shutdown logger and flush remaining logs
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    await this.flush()
  }

  // Private methods
  private log(
    level: LogLevel,
    message: string,
    context?: Partial<LogContext>,
    extra?: Record<string, any>
  ): void {
    // Check if log level is enabled
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return
    }

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      message,
      context: {
        ...this.config.context,
        ...context,
        correlationId: context?.correlationId || this.generateCorrelationId()
      },
      extra,
      fingerprint: this.generateFingerprint(message, level, context)
    }

    // Add to buffer
    this.logBuffer.push(entry)

    // Flush immediately for high-priority logs
    if (level === 'error' || level === 'fatal') {
      this.flush().catch(error => 
        console.error('Failed to flush high-priority log:', error)
      )
    }

    // Check buffer size
    if (this.logBuffer.length >= (this.config.maxBufferSize || 1000)) {
      this.flush().catch(error => 
        console.error('Failed to flush buffer:', error)
      )
    }
  }

  private async sendToTransport(transport: LogTransport, entry: LogEntry): Promise<void> {
    if (!transport.enabled) return
    if (LOG_LEVELS[entry.level] < LOG_LEVELS[transport.level]) return
    if (transport.filter && !transport.filter(entry)) return

    try {
      await transport.transport(entry)
    } catch (error) {
      console.error(`Transport ${transport.name} error:`, error)
    }
  }

  private updatePerformanceMetrics(operation: string, duration: number, success: boolean): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        operationCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0
      })
    }

    const metrics = this.performanceMetrics.get(operation)!
    const previousCount = metrics.operationCount
    const previousErrors = Math.round(metrics.errorRate * previousCount / 100)

    metrics.operationCount++
    metrics.totalDuration += duration
    metrics.averageDuration = metrics.totalDuration / metrics.operationCount
    metrics.minDuration = Math.min(metrics.minDuration, duration)
    metrics.maxDuration = Math.max(metrics.maxDuration, duration)

    // Update error rate
    const currentErrors = success ? previousErrors : previousErrors + 1
    metrics.errorRate = (currentErrors / metrics.operationCount) * 100

    // Calculate percentiles (simplified approach)
    // In production, you'd want to maintain a sliding window of durations
    metrics.p95Duration = metrics.averageDuration * 1.5 // Approximation
    metrics.p99Duration = metrics.averageDuration * 2.0 // Approximation
  }

  private setupDefaultContext(): void {
    const defaultContext: Partial<LogContext> = {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }

    if (typeof window !== 'undefined') {
      defaultContext.userAgent = navigator.userAgent
      defaultContext.url = window.location.href
    }

    this.config.context = {
      ...defaultContext,
      ...this.config.context
    }
  }

  private startPeriodicFlush(): void {
    if (this.config.flushInterval && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => 
          console.error('Periodic flush failed:', error)
        )
      }, this.config.flushInterval)
    }
  }

  private createConsoleTransport(): LogTransport {
    return {
      name: 'console',
      level: 'debug',
      format: 'structured',
      enabled: true,
      transport: (entry: LogEntry) => {
        const logMethod = entry.level === 'debug' ? console.debug :
                         entry.level === 'info' ? console.info :
                         entry.level === 'warn' ? console.warn :
                         console.error

        const timestamp = new Date(entry.timestamp).toISOString()
        const contextStr = Object.entries(entry.context)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${value}`)
          .join(' ')

        logMethod(
          `[${timestamp}] ${entry.level.toUpperCase()} ${entry.message}`,
          contextStr ? `| ${contextStr}` : '',
          entry.extra ? entry.extra : ''
        )
      }
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    if (!this.config.enableCorrelationId) return ''
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
  }

  private generateFingerprint(message: string, level: LogLevel, context?: Partial<LogContext>): string {
    const components = [
      message,
      level,
      context?.component,
      context?.operation
    ].filter(Boolean)
    
    return btoa(components.join('::')).slice(0, 12)
  }
}

// Predefined transport factories
export class LogTransportFactory {
  /**
   * Create file transport (Node.js only)
   */
  static createFileTransport(filePath: string, options: {
    level?: LogLevel
    format?: LogFormat
    maxSize?: number
    rotateDaily?: boolean
  } = {}): LogTransport {
    return {
      name: 'file',
      level: options.level || 'info',
      format: options.format || 'json',
      enabled: typeof window === 'undefined', // Only enable in Node.js
      transport: async (entry: LogEntry) => {
        if (typeof require !== 'undefined' && typeof window === 'undefined') {
          try {
            const fs = eval('require')('fs').promises
            const formattedEntry = JSON.stringify(entry) + '\n'
            await fs.appendFile(filePath, formattedEntry)
          } catch (error) {
            console.warn('File logging not available:', error)
          }
        }
      }
    }
  }

  /**
   * Create HTTP transport for external logging services
   */
  static createHttpTransport(endpoint: string, options: {
    level?: LogLevel
    headers?: Record<string, string>
    batchSize?: number
    timeout?: number
  } = {}): LogTransport {
    let buffer: LogEntry[] = []

    return {
      name: 'http',
      level: options.level || 'warn',
      format: 'json',
      enabled: true,
      bufferSize: options.batchSize || 10,
      transport: async (entry: LogEntry) => {
        buffer.push(entry)

        if (buffer.length >= (options.batchSize || 10)) {
          const batch = [...buffer]
          buffer = []

          try {
            await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              body: JSON.stringify({ logs: batch }),
              signal: AbortSignal.timeout(options.timeout || 5000)
            })
          } catch (error) {
            // Re-add to buffer on failure (with limit)
            if (buffer.length < 100) {
              buffer.unshift(...batch)
            }
            throw error
          }
        }
      }
    }
  }

  /**
   * Create browser storage transport
   */
  static createStorageTransport(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): LogTransport {
    return {
      name: 'storage',
      level: 'error',
      format: 'json',
      enabled: typeof window !== 'undefined',
      transport: (entry: LogEntry) => {
        if (typeof window !== 'undefined') {
          const storage = window[storageType]
          const key = `appboardguru_logs_${entry.level}`
          const existing = storage.getItem(key)
          const logs = existing ? JSON.parse(existing) : []
          
          logs.push(entry)
          
          // Keep only last 50 entries per level
          if (logs.length > 50) {
            logs.splice(0, logs.length - 50)
          }
          
          storage.setItem(key, JSON.stringify(logs))
        }
      }
    }
  }
}

// Default logger instances
export const logger = AdvancedLogger.getLogger('app')
export const apiLogger = AdvancedLogger.getLogger('api')
export const dbLogger = AdvancedLogger.getLogger('database')
export const performanceLogger = AdvancedLogger.getLogger('performance', {
  enablePerformanceTracking: true,
  transports: [
    LogTransportFactory.createStorageTransport('localStorage')
  ]
})

// Convenience functions
export function logError(error: Error, context?: Partial<LogContext>, extra?: Record<string, any>): void {
  logger.error(error.message, error, context, extra)
}

export function logOperation<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: Partial<LogContext>
): Promise<T> {
  return logger.time(operation, fn, context)
}

export function createChildLogger(context: Partial<LogContext>): AdvancedLogger {
  return logger.child(context)
}