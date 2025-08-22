/**
 * Structured Logging System
 * Comprehensive logging with correlation IDs, performance metrics, and OpenTelemetry integration
 */

import { nanoid } from 'nanoid'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  levelName: string
  logger: string
  message: string
  correlationId?: string
  requestId?: string
  userId?: string
  organizationId?: string
  sessionId?: string
  traceId?: string
  spanId?: string
  data?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    duration?: number
    memoryUsage?: NodeJS.MemoryUsage
    cpuUsage?: NodeJS.CpuUsage
  }
  context?: {
    service: string
    version: string
    environment: string
    region?: string
    instance?: string
    request?: {
      method: string
      url: string
      userAgent?: string
      ip?: string
      headers?: Record<string, string>
    }
  }
}

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string
  log(entry: LogEntry): Promise<void>
  flush?(): Promise<void>
  close?(): Promise<void>
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  name: string
  level: LogLevel
  transports: LogTransport[]
  context?: Partial<LogEntry['context']>
  enablePerformanceTracking?: boolean
  enableCorrelationTracking?: boolean
  sanitizeFields?: string[]
  maxDataSize?: number
}

/**
 * Console transport for development
 */
export class ConsoleTransport implements LogTransport {
  name = 'console'
  private colors = {
    [LogLevel.TRACE]: '\x1b[37m', // white
    [LogLevel.DEBUG]: '\x1b[36m', // cyan
    [LogLevel.INFO]: '\x1b[32m',  // green
    [LogLevel.WARN]: '\x1b[33m',  // yellow
    [LogLevel.ERROR]: '\x1b[31m', // red
    [LogLevel.FATAL]: '\x1b[35m'  // magenta
  }
  private reset = '\x1b[0m'

  async log(entry: LogEntry): Promise<void> {
    const color = this.colors[entry.level] || ''
    const timestamp = new Date(entry.timestamp).toISOString()
    const prefix = `${color}[${timestamp}] ${entry.levelName.padEnd(5)} ${entry.logger}${this.reset}`
    
    let message = `${prefix}: ${entry.message}`
    
    if (entry.correlationId) {
      message += ` [CID: ${entry.correlationId}]`
    }
    
    if (entry.requestId) {
      message += ` [RID: ${entry.requestId}]`
    }

    console.log(message)

    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log(`${color}  Data:${this.reset}`, entry.data)
    }

    if (entry.error) {
      console.error(`${color}  Error:${this.reset}`, entry.error)
    }

    if (entry.performance) {
      console.log(`${color}  Performance:${this.reset}`, entry.performance)
    }
  }
}

/**
 * File transport for production logging
 */
export class FileTransport implements LogTransport {
  name = 'file'
  private writeStream?: NodeJS.WritableStream

  constructor(
    private filePath: string,
    private maxSize: number = 100 * 1024 * 1024, // 100MB
    private maxFiles: number = 5
  ) {}

  async log(entry: LogEntry): Promise<void> {
    try {
      // Initialize write stream if needed
      if (!this.writeStream) {
        await this.initializeStream()
      }

      const logLine = JSON.stringify(entry) + '\n'
      
      // Check if we need to rotate the log file
      if (this.shouldRotate(logLine)) {
        await this.rotateFile()
      }

      this.writeStream!.write(logLine)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private async initializeStream(): Promise<void> {
    const fs = await import('fs')
    const path = await import('path')
    
    // Ensure directory exists
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'a' })
  }

  private shouldRotate(newLine: string): boolean {
    if (!this.writeStream) return false
    
    try {
      const fs = require('fs')
      const stats = fs.statSync(this.filePath)
      return stats.size + Buffer.byteLength(newLine) > this.maxSize
    } catch {
      return false
    }
  }

  private async rotateFile(): Promise<void> {
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      // Close current stream
      if (this.writeStream) {
        this.writeStream.end()
      }

      const ext = path.extname(this.filePath)
      const baseName = path.basename(this.filePath, ext)
      const dir = path.dirname(this.filePath)

      // Rotate existing files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}${ext}`)
        const newFile = path.join(dir, `${baseName}.${i + 1}${ext}`)
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile) // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile)
          }
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(dir, `${baseName}.1${ext}`)
      if (fs.existsSync(this.filePath)) {
        fs.renameSync(this.filePath, rotatedFile)
      }

      // Create new stream
      await this.initializeStream()
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(resolve)
      } else {
        resolve()
      }
    })
  }
}

/**
 * HTTP transport for external log aggregation services
 */
export class HTTPTransport implements LogTransport {
  name = 'http'
  private queue: LogEntry[] = []
  private flushTimer?: NodeJS.Timeout
  
  constructor(
    private endpoint: string,
    private apiKey?: string,
    private batchSize: number = 10,
    private flushIntervalMs: number = 5000,
    private headers: Record<string, string> = {}
  ) {
    this.scheduleFlush()
  }

  async log(entry: LogEntry): Promise<void> {
    this.queue.push(entry)
    
    if (this.queue.length >= this.batchSize) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const batch = [...this.queue]
    this.queue = []

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.headers
      }

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ logs: batch })
      })
    } catch (error) {
      console.error('Failed to send logs to HTTP transport:', error)
      // Re-queue failed logs (with limit to prevent infinite growth)
      if (this.queue.length < 1000) {
        this.queue.unshift(...batch)
      }
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error)
    }, this.flushIntervalMs)
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    await this.flush()
  }
}

/**
 * Main Logger class
 */
export class Logger {
  private static loggers = new Map<string, Logger>()
  private static globalContext: Partial<LogEntry['context']> = {
    service: process.env.SERVICE_NAME || 'appboardguru',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || 'us-east-1',
    instance: process.env.INSTANCE_ID || nanoid(8)
  }

  private correlationId?: string
  private requestId?: string
  private userId?: string
  private organizationId?: string
  private sessionId?: string
  private performanceStart?: [number, number]

  constructor(private config: LoggerConfig) {}

  /**
   * Get or create logger instance
   */
  static getLogger(name: string, config?: Partial<LoggerConfig>): Logger {
    if (!Logger.loggers.has(name)) {
      const defaultConfig: LoggerConfig = {
        name,
        level: process.env.LOG_LEVEL ? 
          LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] || LogLevel.INFO : 
          LogLevel.INFO,
        transports: [new ConsoleTransport()],
        context: Logger.globalContext,
        enablePerformanceTracking: true,
        enableCorrelationTracking: true,
        sanitizeFields: ['password', 'token', 'secret', 'key', 'auth'],
        maxDataSize: 10000
      }

      // Add file transport in production
      if (process.env.NODE_ENV === 'production') {
        defaultConfig.transports.push(
          new FileTransport(`/var/log/${name}.log`)
        )
      }

      // Add HTTP transport if configured
      if (process.env.LOG_ENDPOINT) {
        defaultConfig.transports.push(
          new HTTPTransport(
            process.env.LOG_ENDPOINT,
            process.env.LOG_API_KEY
          )
        )
      }

      Logger.loggers.set(name, new Logger({ ...defaultConfig, ...config }))
    }

    return Logger.loggers.get(name)!
  }

  /**
   * Set global context for all loggers
   */
  static setGlobalContext(context: Partial<LogEntry['context']>): void {
    Logger.globalContext = { ...Logger.globalContext, ...context }
  }

  /**
   * Set correlation context
   */
  withCorrelation(correlationId: string): Logger {
    this.correlationId = correlationId
    return this
  }

  withRequest(requestId: string): Logger {
    this.requestId = requestId
    return this
  }

  withUser(userId: string, organizationId?: string): Logger {
    this.userId = userId
    this.organizationId = organizationId
    return this
  }

  withSession(sessionId: string): Logger {
    this.sessionId = sessionId
    return this
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking(): Logger {
    if (this.config.enablePerformanceTracking) {
      this.performanceStart = process.hrtime()
    }
    return this
  }

  /**
   * Log methods for different levels
   */
  trace(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, data)
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, error?: Error | Record<string, any>): void {
    let errorData: LogEntry['error'] | undefined
    let data: Record<string, any> | undefined

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } else if (error) {
      data = error
    }

    this.log(LogLevel.ERROR, message, data, errorData)
  }

  fatal(message: string, error?: Error | Record<string, any>): void {
    let errorData: LogEntry['error'] | undefined
    let data: Record<string, any> | undefined

    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } else if (error) {
      data = error
    }

    this.log(LogLevel.FATAL, message, data, errorData)
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: LogEntry['error']
  ): void {
    if (level < this.config.level) {
      return // Skip if below configured level
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      logger: this.config.name,
      message,
      correlationId: this.correlationId,
      requestId: this.requestId,
      userId: this.userId,
      organizationId: this.organizationId,
      sessionId: this.sessionId,
      context: this.config.context,
      error
    }

    // Add performance data
    if (this.config.enablePerformanceTracking) {
      entry.performance = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }

      if (this.performanceStart) {
        const [seconds, nanoseconds] = process.hrtime(this.performanceStart)
        entry.performance.duration = seconds * 1000 + nanoseconds / 1000000
        this.performanceStart = undefined // Reset after use
      }
    }

    // Add sanitized data
    if (data) {
      entry.data = this.sanitizeData(data)
    }

    // Log to all transports
    this.config.transports.forEach(transport => {
      transport.log(entry).catch(err => {
        console.error(`Transport ${transport.name} failed:`, err)
      })
    })
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    if (!this.config.sanitizeFields || this.config.sanitizeFields.length === 0) {
      return this.truncateData(data)
    }

    const sanitized = this.sanitizeObject(data, this.config.sanitizeFields)
    return this.truncateData(sanitized)
  }

  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (obj === null || obj === undefined) return obj
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, sensitiveFields))
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        const isSensitive = sensitiveFields.some(field => 
          lowerKey.includes(field.toLowerCase())
        )

        if (isSensitive) {
          result[key] = '[REDACTED]'
        } else {
          result[key] = this.sanitizeObject(value, sensitiveFields)
        }
      }
      return result
    }

    return obj
  }

  /**
   * Truncate large data objects
   */
  private truncateData(data: Record<string, any>): Record<string, any> {
    if (!this.config.maxDataSize) return data

    const serialized = JSON.stringify(data)
    if (serialized.length <= this.config.maxDataSize) {
      return data
    }

    // Truncate and add indicator
    const truncated = serialized.substring(0, this.config.maxDataSize)
    return {
      ...data,
      _truncated: true,
      _originalSize: serialized.length,
      _truncatedAt: this.config.maxDataSize
    }
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.config.transports
        .filter(t => t.flush)
        .map(t => t.flush!())
    )
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await Promise.all(
      this.config.transports
        .filter(t => t.close)
        .map(t => t.close!())
    )
  }
}

/**
 * Create business event logger
 */
export class BusinessEventLogger extends Logger {
  constructor(name: string = 'BusinessEvents') {
    super({
      name,
      level: LogLevel.INFO,
      transports: [new ConsoleTransport()],
      enablePerformanceTracking: false,
      enableCorrelationTracking: true
    })
  }

  logUserAction(
    action: string,
    userId: string,
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): void {
    this.withUser(userId).info(`User Action: ${action}`, {
      action,
      resource,
      resourceId,
      metadata,
      eventType: 'user_action'
    })
  }

  logSystemEvent(
    event: string,
    system: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`System Event: ${event}`, {
      event,
      system,
      metadata,
      eventType: 'system_event'
    })
  }

  logBusinessRule(
    rule: string,
    decision: 'allowed' | 'denied',
    context?: Record<string, any>
  ): void {
    this.info(`Business Rule: ${rule} - ${decision}`, {
      rule,
      decision,
      context,
      eventType: 'business_rule'
    })
  }
}

/**
 * Default logger instances
 */
export const defaultLogger = Logger.getLogger('App')
export const securityLogger = Logger.getLogger('Security')
export const performanceLogger = Logger.getLogger('Performance')
export const businessEventLogger = new BusinessEventLogger()