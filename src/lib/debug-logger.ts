/**
 * Debug Logger for User Creation Process
 * Provides detailed logging to help debug approval workflow issues
 */

import { isDevelopment } from '@/config/environment'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  operation: string
  email?: string
  details: any
}

class DebugLogger {
  private logs: LogEntry[] = []
  private maxLogs = 100

  private createLogEntry(
    level: LogEntry['level'],
    operation: string,
    email: string | undefined,
    details: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      operation,
      email,
      details
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

    // Keep in memory for debugging
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  info(operation: string, email?: string, details?: any) {
    this.addLog(this.createLogEntry('info', operation, email, details))
  }

  warning(operation: string, email?: string, details?: any) {
    this.addLog(this.createLogEntry('warning', operation, email, details))
  }

  error(operation: string, email?: string, details?: any) {
    this.addLog(this.createLogEntry('error', operation, email, details))
  }

  debug(operation: string, email?: string, details?: any) {
    this.addLog(this.createLogEntry('debug', operation, email, details))
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

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  // Get logs for specific email
  getLogsForEmail(email: string): LogEntry[] {
    return this.logs.filter(log => log.email === email)
  }

  // Clear logs (useful for testing)
  clearLogs() {
    this.logs = []
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger()

// Helper function to log function entry/exit
export function logFunction<T extends any[], R>(
  functionName: string,
  email?: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      debugLogger.debug(`${functionName}_START`, email, { args: args.length })
      
      try {
        const result = await originalMethod.apply(this, args)
        debugLogger.debug(`${functionName}_SUCCESS`, email, { 
          resultType: typeof result 
        })
        return result
      } catch (error) {
        debugLogger.error(`${functionName}_ERROR`, email, {
          error: error instanceof Error ? error.message : error
        })
        throw error
      }
    }

    return descriptor
  }
}

// Helper to create timestamped operation tracker
export function createOperationTracker(operationName: string, email?: string) {
  const startTime = Date.now()
  debugLogger.info(`${operationName}_START`, email, { startTime })

  return {
    success: (details?: any) => {
      const duration = Date.now() - startTime
      debugLogger.info(`${operationName}_SUCCESS`, email, { 
        duration: `${duration}ms`, 
        ...details 
      })
    },
    error: (error: any, details?: any) => {
      const duration = Date.now() - startTime
      debugLogger.error(`${operationName}_ERROR`, email, { 
        duration: `${duration}ms`, 
        error: error instanceof Error ? error.message : error,
        ...details 
      })
    }
  }
}