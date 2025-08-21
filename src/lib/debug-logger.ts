/**
 * Debug Logger for User Creation Process
 * Provides detailed logging to help debug approval workflow issues
 */

import { isDevelopment } from '@/config/environment'

export interface LogEntry {
  readonly timestamp: string
  readonly level: 'info' | 'warning' | 'error' | 'debug'
  readonly operation: string
  readonly email?: string
  readonly details: any
  readonly sessionId?: string
  readonly userId?: string
  readonly requestId?: string
}

export interface LogFilter {
  readonly level?: 'info' | 'warning' | 'error' | 'debug'
  readonly operation?: string
  readonly email?: string
  readonly startTime?: Date
  readonly endTime?: Date
  readonly sessionId?: string
}

export interface LoggerConfig {
  readonly maxLogs: number
  readonly enableConsoleInProduction: boolean
  readonly enableFileLogging: boolean
  readonly logLevels: readonly ('info' | 'warning' | 'error' | 'debug')[]
  readonly persistentStorage: boolean
}

class DebugLogger {
  private logs: LogEntry[] = []
  private config: LoggerConfig = {
    maxLogs: 100,
    enableConsoleInProduction: false,
    enableFileLogging: false,
    logLevels: ['info', 'warning', 'error', 'debug'],
    persistentStorage: false
  }

  private createLogEntry(
    level: LogEntry['level'],
    operation: string,
    email: string | undefined,
    details: any,
    metadata: {
      sessionId?: string
      userId?: string
      requestId?: string
    } = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      operation,
      email,
      details,
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      requestId: metadata.requestId
    }
  }

  private addLog(entry: LogEntry) {
    // Always log to console in development
    if (isDevelopment()) {
      const prefix = `[${entry.level.toUpperCase()}] ${entry.operation}`
      const message = entry.email ? `${prefix} (${entry.email})` : prefix
      
      switch (entry.level) {
        case 'error':
          console.error(message, entry.details)
          break
        case 'warning':
          console.warn(message, entry.details)
          break
        case 'debug':
          console.debug(message, entry.details)
          break
        default:
          console.log(message, entry.details)
      }
    } else {
      // In production, only log errors and warnings
      if (entry.level === 'error' || entry.level === 'warning') {
        console.log(`[${entry.level.toUpperCase()}] ${entry.operation}`, {
          email: entry.email,
          details: typeof entry.details === 'object' 
            ? JSON.stringify(entry.details, null, 2) 
            : entry.details
        })
      }
    }

    // Check if this log level is enabled
    if (!this.config.logLevels.includes(entry.level)) {
      return
    }

    // Keep in memory for debugging
    this.logs.push(entry)
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift()
    }

    // Persist to storage if enabled
    if (this.config.persistentStorage) {
      this.persistLog(entry)
    }
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Log info level message
   */
  info(operation: string, email?: string, details?: any, metadata?: { sessionId?: string; userId?: string; requestId?: string }) {
    this.addLog(this.createLogEntry('info', operation, email, details, metadata))
  }

  /**
   * Log warning level message
   */
  warning(operation: string, email?: string, details?: any, metadata?: { sessionId?: string; userId?: string; requestId?: string }) {
    this.addLog(this.createLogEntry('warning', operation, email, details, metadata))
  }

  /**
   * Log error level message
   */
  error(operation: string, email?: string, details?: any, metadata?: { sessionId?: string; userId?: string; requestId?: string }) {
    this.addLog(this.createLogEntry('error', operation, email, details, metadata))
  }

  /**
   * Log debug level message
   */
  debug(operation: string, email?: string, details?: any, metadata?: { sessionId?: string; userId?: string; requestId?: string }) {
    this.addLog(this.createLogEntry('debug', operation, email, details, metadata))
  }

  // Specific logging methods for user creation workflow
  approvalStart(email: string, registrationId: string) {
    this.info('APPROVAL_START', email, { registrationId })
  }

  approvalRegistrationFetch(email: string, success: boolean, details: any) {
    if (success) {
      this.info('REGISTRATION_FETCH_SUCCESS', email, details)
    } else {
      this.error('REGISTRATION_FETCH_FAILED', email, details)
    }
  }

  authUserCreateStart(email: string, fullName: string) {
    this.info('AUTH_USER_CREATE_START', email, { fullName })
  }

  authUserCreateResult(email: string, success: boolean, details: any) {
    if (success) {
      this.info('AUTH_USER_CREATE_SUCCESS', email, details)
    } else {
      this.error('AUTH_USER_CREATE_FAILED', email, details)
    }
  }

  usersTableInsertStart(email: string, userId: string) {
    this.info('USERS_TABLE_INSERT_START', email, { userId })
  }

  usersTableInsertResult(email: string, success: boolean, details: any) {
    if (success) {
      this.info('USERS_TABLE_INSERT_SUCCESS', email, details)
    } else {
      this.error('USERS_TABLE_INSERT_FAILED', email, details)
    }
  }

  magicLinkGenerate(email: string, success: boolean, details: any) {
    if (success) {
      this.info('MAGIC_LINK_GENERATED', email, details)
    } else {
      this.error('MAGIC_LINK_FAILED', email, details)
    }
  }

  emailSent(email: string, type: string, success: boolean, details: any) {
    if (success) {
      this.info('EMAIL_SENT', email, { type, ...details })
    } else {
      this.error('EMAIL_FAILED', email, { type, ...details })
    }
  }

  approvalComplete(email: string, success: boolean, details: any) {
    if (success) {
      this.info('APPROVAL_COMPLETE', email, details)
    } else {
      this.error('APPROVAL_FAILED', email, details)
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): readonly LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Get logs for specific email
   */
  getLogsForEmail(email: string): readonly LogEntry[] {
    return this.logs.filter(log => log.email === email)
  }

  /**
   * Get filtered logs
   */
  getFilteredLogs(filter: LogFilter): readonly LogEntry[] {
    return this.logs.filter(log => {
      if (filter.level && log.level !== filter.level) return false
      if (filter.operation && !log.operation.includes(filter.operation)) return false
      if (filter.email && log.email !== filter.email) return false
      if (filter.sessionId && log.sessionId !== filter.sessionId) return false
      
      if (filter.startTime || filter.endTime) {
        const logTime = new Date(log.timestamp)
        if (filter.startTime && logTime < filter.startTime) return false
        if (filter.endTime && logTime > filter.endTime) return false
      }
      
      return true
    })
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): {
    readonly total: number
    readonly byLevel: Record<string, number>
    readonly byOperation: Record<string, number>
    readonly timeRange: { earliest: string; latest: string } | null
  } {
    const byLevel: Record<string, number> = {}
    const byOperation: Record<string, number> = {}
    
    let earliest: string | null = null
    let latest: string | null = null
    
    for (const log of this.logs) {
      // Count by level
      byLevel[log.level] = (byLevel[log.level] || 0) + 1
      
      // Count by operation
      byOperation[log.operation] = (byOperation[log.operation] || 0) + 1
      
      // Track time range
      if (!earliest || log.timestamp < earliest) earliest = log.timestamp
      if (!latest || log.timestamp > latest) latest = log.timestamp
    }
    
    return {
      total: this.logs.length,
      byLevel,
      byOperation,
      timeRange: earliest && latest ? { earliest, latest } : null
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logsToExport = filter ? this.getFilteredLogs(filter) : this.logs
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalLogs: logsToExport.length,
      logs: logsToExport
    }, null, 2)
  }

  /**
   * Clear logs (useful for testing)
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Persist log to storage (placeholder for future implementation)
   */
  private persistLog(entry: LogEntry): void {
    // This could be implemented to write to local storage, IndexedDB, or send to server
    // For now, it's a placeholder
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const persistedLogs = localStorage.getItem('debugLogs')
        const logs = persistedLogs ? JSON.parse(persistedLogs) : []
        logs.push(entry)
        
        // Keep only last 1000 logs in storage
        if (logs.length > 1000) {
          logs.splice(0, logs.length - 1000)
        }
        
        localStorage.setItem('debugLogs', JSON.stringify(logs))
      } catch (error) {
        // Silently fail if localStorage is not available
        console.warn('Failed to persist log to localStorage:', error)
      }
    }
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger()

/**
 * Enhanced decorator for logging function entry/exit with better type safety
 */
export function logFunction<T extends readonly any[], R>(
  functionName: string,
  options: {
    email?: string
    logLevel?: 'info' | 'debug'
    logArgs?: boolean
    logResult?: boolean
    sessionId?: string
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value
    const { email, logLevel = 'debug', logArgs = false, logResult = false, sessionId } = options

    descriptor.value = async function (...args: T): Promise<R> {
      const metadata = { sessionId, requestId: `${functionName}_${Date.now()}` }
      const startTime = Date.now()
      
      const logMethod = logLevel === 'info' ? debugLogger.info : debugLogger.debug
      
      logMethod(`${functionName}_START`, email, {
        argsCount: args.length,
        ...(logArgs && { args: args.slice(0, 3) }) // Log first 3 args for security
      }, metadata)
      
      try {
        const result = await originalMethod.apply(this, args)
        const duration = Date.now() - startTime
        
        logMethod(`${functionName}_SUCCESS`, email, { 
          duration: `${duration}ms`,
          resultType: typeof result,
          ...(logResult && { result: typeof result === 'object' ? '[Object]' : result })
        }, metadata)
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        debugLogger.error(`${functionName}_ERROR`, email, {
          duration: `${duration}ms`,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
          } : String(error)
        }, metadata)
        
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Enhanced operation tracker with better type safety and additional features
 */
export function createOperationTracker(
  operationName: string, 
  options: {
    email?: string
    sessionId?: string
    userId?: string
    autoLogStart?: boolean
  } = {}
): {
  readonly success: (details?: Record<string, any>) => void
  readonly error: (error: any, details?: Record<string, any>) => void
  readonly warn: (message: string, details?: Record<string, any>) => void
  readonly info: (message: string, details?: Record<string, any>) => void
  readonly addCheckpoint: (name: string, details?: Record<string, any>) => void
  readonly getDuration: () => number
  readonly getMetadata: () => Record<string, any>
} {
  const startTime = Date.now()
  const metadata = {
    sessionId: options.sessionId,
    userId: options.userId,
    requestId: `${operationName}_${startTime}`
  }
  const checkpoints: Array<{ name: string; timestamp: number; details?: any }> = []
  
  if (options.autoLogStart !== false) {
    debugLogger.info(`${operationName}_START`, options.email, { 
      startTime: new Date(startTime).toISOString() 
    }, metadata)
  }

  return {
    success: (details?: Record<string, any>) => {
      const duration = Date.now() - startTime
      debugLogger.info(`${operationName}_SUCCESS`, options.email, { 
        duration: `${duration}ms`,
        checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
        ...details 
      }, metadata)
    },
    
    error: (error: any, details?: Record<string, any>) => {
      const duration = Date.now() - startTime
      debugLogger.error(`${operationName}_ERROR`, options.email, { 
        duration: `${duration}ms`,
        checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        } : String(error),
        ...details 
      }, metadata)
    },
    
    warn: (message: string, details?: Record<string, any>) => {
      const duration = Date.now() - startTime
      debugLogger.warning(`${operationName}_WARN`, options.email, {
        message,
        duration: `${duration}ms`,
        ...details
      }, metadata)
    },
    
    info: (message: string, details?: Record<string, any>) => {
      const duration = Date.now() - startTime
      debugLogger.info(`${operationName}_INFO`, options.email, {
        message,
        duration: `${duration}ms`,
        ...details
      }, metadata)
    },
    
    addCheckpoint: (name: string, details?: Record<string, any>) => {
      checkpoints.push({
        name,
        timestamp: Date.now() - startTime,
        details
      })
    },
    
    getDuration: () => Date.now() - startTime,
    
    getMetadata: () => ({ ...metadata, checkpoints })
  }
}