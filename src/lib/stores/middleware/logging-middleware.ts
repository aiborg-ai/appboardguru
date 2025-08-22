import { StateCreator, StoreMutatorIdentifier } from 'zustand'

// Logging configuration
export interface LoggingConfig {
  enabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  includeState: boolean
  includePreviousState: boolean
  includeTimestamp: boolean
  includeStackTrace: boolean
  maxLogEntries: number
  persistLogs: boolean
  filterActions?: string[]
  excludeActions?: string[]
  customFormatter?: (log: LogEntry) => string
}

// Log entry structure
export interface LogEntry {
  id: string
  timestamp: number
  storeName: string
  action: string
  prevState?: any
  nextState?: any
  args?: any[]
  duration?: number
  stackTrace?: string
  error?: Error
  metadata?: Record<string, any>
}

// Default logging configuration
const defaultConfig: LoggingConfig = {
  enabled: process.env.NODE_ENV === 'development',
  logLevel: 'info',
  includeState: true,
  includePreviousState: false,
  includeTimestamp: true,
  includeStackTrace: false,
  maxLogEntries: 1000,
  persistLogs: false
}

// Global log store
class LogStore {
  private logs: LogEntry[] = []
  private config: LoggingConfig
  private subscribers: Set<(logs: LogEntry[]) => void> = new Set()

  constructor(config: LoggingConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config }
  }

  addLog(entry: LogEntry): void {
    if (!this.config.enabled) return

    this.logs.push(entry)
    
    // Limit log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries)
    }

    // Persist logs if enabled
    if (this.config.persistLogs && typeof window !== 'undefined') {
      try {
        localStorage.setItem('zustand-logs', JSON.stringify(this.logs.slice(-100))) // Keep last 100
      } catch (error) {
        console.warn('[LoggingMiddleware] Failed to persist logs:', error)
      }
    }

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback([...this.logs])
      } catch (error) {
        console.error('[LoggingMiddleware] Error in log subscriber:', error)
      }
    })

    // Console output
    this.outputToConsole(entry)
  }

  private outputToConsole(entry: LogEntry): void {
    const { customFormatter } = this.config
    
    if (customFormatter) {
      console.log(customFormatter(entry))
      return
    }

    const timestamp = new Date(entry.timestamp).toISOString()
    const duration = entry.duration ? ` (${entry.duration.toFixed(2)}ms)` : ''
    
    let logMessage = `[${entry.storeName}] ${entry.action}${duration}`
    
    if (this.config.includeTimestamp) {
      logMessage = `${timestamp} ${logMessage}`
    }

    const logLevel = this.config.logLevel
    const logFn = console[logLevel] || console.log

    if (entry.error) {
      console.error(logMessage, entry.error)
    } else {
      logFn(logMessage)
    }

    // Log state changes if enabled
    if (this.config.includeState && entry.nextState) {
      console.group(`${logMessage} - State`)
      
      if (this.config.includePreviousState && entry.prevState) {
        console.log('Previous:', entry.prevState)
      }
      
      console.log('Current:', entry.nextState)
      
      if (entry.args && entry.args.length > 0) {
        console.log('Arguments:', entry.args)
      }
      
      if (this.config.includeStackTrace && entry.stackTrace) {
        console.log('Stack:', entry.stackTrace)
      }
      
      console.groupEnd()
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
    
    if (this.config.persistLogs && typeof window !== 'undefined') {
      localStorage.removeItem('zustand-logs')
    }
    
    this.subscribers.forEach(callback => callback([]))
  }

  subscribe(callback: (logs: LogEntry[]) => void): () => void {
    this.subscribers.add(callback)
    
    // Send current logs immediately
    callback([...this.logs])
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): LoggingConfig {
    return { ...this.config }
  }

  // Load persisted logs
  loadPersistedLogs(): void {
    if (!this.config.persistLogs || typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('zustand-logs')
      if (stored) {
        const logs = JSON.parse(stored) as LogEntry[]
        this.logs = logs.slice(-this.config.maxLogEntries)
      }
    } catch (error) {
      console.warn('[LoggingMiddleware] Failed to load persisted logs:', error)
    }
  }
}

// Global log store instance
const logStore = new LogStore()

// Load persisted logs on initialization
if (typeof window !== 'undefined') {
  logStore.loadPersistedLogs()
}

// Logging middleware implementation
export interface LoggingMiddleware {
  $$logStore: LogStore
}

type LoggingImpl = <T>(
  storeInitializer: StateCreator<T, [], [], T>,
  storeName?: string,
  config?: Partial<LoggingConfig>
) => StateCreator<T, [], [], T & LoggingMiddleware>

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    'zustand/logging': LoggingImpl
  }
}

type LoggingType = 'zustand/logging'

const loggingImpl: LoggingImpl = (storeInitializer, storeName = 'unknown', config = {}) => {
  const mergedConfig = { ...defaultConfig, ...config }
  const storeLogStore = new LogStore(mergedConfig)
  
  return (set, get, api) => {
    const wrappedSet = (updater: any, replace?: boolean, action?: string) => {
      if (!mergedConfig.enabled) {
        return set(updater, replace, action)
      }

      // Check if action should be filtered
      if (mergedConfig.filterActions && !mergedConfig.filterActions.includes(action || 'unknown')) {
        return set(updater, replace, action)
      }
      
      if (mergedConfig.excludeActions && mergedConfig.excludeActions.includes(action || 'unknown')) {
        return set(updater, replace, action)
      }

      const startTime = performance.now()
      const prevState = mergedConfig.includePreviousState ? get() : undefined
      const actionName = action || 'setState'
      
      // Capture stack trace if enabled
      let stackTrace: string | undefined
      if (mergedConfig.includeStackTrace) {
        stackTrace = new Error().stack
      }

      try {
        const result = set(updater, replace, action)
        const endTime = performance.now()
        const nextState = mergedConfig.includeState ? get() : undefined

        const logEntry: LogEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          storeName,
          action: actionName,
          prevState,
          nextState,
          duration: endTime - startTime,
          stackTrace,
          args: typeof updater === 'function' ? [] : [updater, replace, action]
        }

        storeLogStore.addLog(logEntry)
        return result
      } catch (error) {
        const endTime = performance.now()
        
        const logEntry: LogEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          storeName,
          action: actionName,
          prevState,
          duration: endTime - startTime,
          stackTrace,
          error: error instanceof Error ? error : new Error(String(error)),
          args: typeof updater === 'function' ? [] : [updater, replace, action]
        }

        storeLogStore.addLog(logEntry)
        throw error
      }
    }

    const store = storeInitializer(wrappedSet, get, api)
    
    return {
      ...store,
      $$logStore: storeLogStore
    }
  }
}

// Export the middleware
export const logging = loggingImpl

// Utility functions
export const createLoggingMiddleware = (storeName?: string, config?: Partial<LoggingConfig>) => {
  return (storeInitializer: StateCreator<any, [], [], any>) => 
    logging(storeInitializer, storeName, config)
}

// React hooks for accessing logs
export function useStoreLogs(storeName?: string) {
  const [logs, setLogs] = React.useState<LogEntry[]>([])

  React.useEffect(() => {
    const unsubscribe = logStore.subscribe((allLogs) => {
      const filteredLogs = storeName 
        ? allLogs.filter(log => log.storeName === storeName)
        : allLogs
      setLogs(filteredLogs)
    })

    return unsubscribe
  }, [storeName])

  return logs
}

export function useLoggingControls() {
  return {
    clearLogs: () => logStore.clearLogs(),
    updateConfig: (config: Partial<LoggingConfig>) => logStore.updateConfig(config),
    getConfig: () => logStore.getConfig(),
    getLogs: () => logStore.getLogs(),
    exportLogs: () => {
      const logs = logStore.getLogs()
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zustand-logs-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}

// Performance analysis utilities
export const logAnalyzer = {
  getActionStats: (logs: LogEntry[] = logStore.getLogs()) => {
    const stats = new Map<string, { count: number; totalTime: number; avgTime: number }>()
    
    logs.forEach(log => {
      if (log.duration) {
        const existing = stats.get(log.action) || { count: 0, totalTime: 0, avgTime: 0 }
        existing.count++
        existing.totalTime += log.duration
        existing.avgTime = existing.totalTime / existing.count
        stats.set(log.action, existing)
      }
    })
    
    return Array.from(stats.entries()).map(([action, data]) => ({
      action,
      ...data
    })).sort((a, b) => b.avgTime - a.avgTime)
  },

  getSlowestActions: (threshold: number = 10, logs: LogEntry[] = logStore.getLogs()) => {
    return logs
      .filter(log => log.duration && log.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 20)
  },

  getErrorLogs: (logs: LogEntry[] = logStore.getLogs()) => {
    return logs.filter(log => log.error)
  },

  generateReport: (logs: LogEntry[] = logStore.getLogs()) => {
    const actionStats = logAnalyzer.getActionStats(logs)
    const slowActions = logAnalyzer.getSlowestActions(10, logs)
    const errors = logAnalyzer.getErrorLogs(logs)
    
    return {
      summary: {
        totalLogs: logs.length,
        totalErrors: errors.length,
        avgDuration: logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length,
        timespan: logs.length > 0 ? {
          start: new Date(Math.min(...logs.map(l => l.timestamp))),
          end: new Date(Math.max(...logs.map(l => l.timestamp)))
        } : null
      },
      actionStats,
      slowActions,
      errors: errors.slice(0, 10)
    }
  }
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make logging utilities available globally
  (window as any).zustandLogs = {
    getLogs: () => logStore.getLogs(),
    clearLogs: () => logStore.clearLogs(),
    analyzer: logAnalyzer,
    config: (config: Partial<LoggingConfig>) => logStore.updateConfig(config)
  }
}

// Export the global log store for direct access
export { logStore }