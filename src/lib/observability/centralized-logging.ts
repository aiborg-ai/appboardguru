/**
 * Centralized Logging System
 * Structured logging with aggregation, filtering, and analysis capabilities
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from './metrics-collector'
import { DistributedTracer } from './distributed-tracer'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

// Core interfaces
export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: string
  service: string
  version: string
  environment: string
  traceId?: string
  spanId?: string
  userId?: string
  sessionId?: string
  requestId?: string
  operation?: string
  duration?: number
  error?: LogError
  context: Record<string, any>
  metadata: Record<string, any>
  tags: string[]
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogError {
  name: string
  message: string
  stack?: string
  code?: string
  statusCode?: number
  cause?: any
}

export interface LogQuery {
  levels?: LogLevel[]
  services?: string[]
  timeRange?: {
    start: string
    end: string
  }
  traceId?: string
  userId?: string
  operation?: string
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
}

export interface LogAggregation {
  field: string
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max'
  interval?: string // '1m', '5m', '1h', '1d'
}

export interface LogAlert {
  id: string
  name: string
  description: string
  query: LogQuery
  threshold: {
    value: number
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    timeWindow: number // seconds
  }
  isActive: boolean
  lastTriggered?: string
  actions: LogAlertAction[]
  metadata: Record<string, any>
}

export type LogAlertAction = 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty'

export interface LogProcessor {
  name: string
  process(entry: LogEntry): Promise<LogEntry | null>
}

export interface LogShipper {
  name: string
  ship(entries: LogEntry[]): Promise<Result<void, string>>
}

/**
 * Centralized Logging Manager
 */
export class CentralizedLoggingManager extends EventEmitter {
  private logBuffer: LogEntry[] = []
  private processors: LogProcessor[] = []
  private shippers: LogShipper[] = []
  private alerts: Map<string, LogAlert> = new Map()
  private alertCounters: Map<string, { count: number; windowStart: number }> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      bufferSize: number
      flushInterval: number
      enableStructuredLogging: boolean
      enableSampling: boolean
      samplingRate: number
      retentionDays: number
      compressionEnabled: boolean
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()

    this.setupProcessors()
    this.setupShippers()
    this.setupFlushTimer()
    this.setupCleanupTasks()
  }

  /**
   * Log entry with structured format
   */
  async log(
    level: LogLevel,
    message: string,
    context: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<Result<LogEntry, string>> {
    try {
      const currentSpan = this.tracer.getActiveSpan()
      
      const entry: LogEntry = {
        id: nanoid(),
        level,
        message,
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'boardguru-api',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        traceId: currentSpan?.traceId,
        spanId: currentSpan?.spanId,
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        operation: context.operation,
        duration: context.duration,
        error: context.error ? this.formatError(context.error) : undefined,
        context: this.sanitizeContext(context),
        metadata,
        tags: this.extractTags(context, metadata)
      }

      // Process through processors
      let processedEntry: LogEntry | null = entry
      for (const processor of this.processors) {
        if (processedEntry) {
          processedEntry = await processor.process(processedEntry)
        }
      }

      if (processedEntry) {
        this.logBuffer.push(processedEntry)
        
        // Check buffer size
        if (this.logBuffer.length >= this.options.bufferSize) {
          await this.flush()
        }

        // Check alerts
        await this.checkAlerts(processedEntry)
        
        this.metrics.recordLogEntry(level, processedEntry.service)
        this.emit('logEntry', processedEntry)
        
        return success(processedEntry)
      }

      return success(entry)

    } catch (error) {
      return failure(`Logging failed: ${(error as Error).message}`)
    }
  }

  /**
   * Convenience logging methods
   */
  async trace(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('trace', message, context)
  }

  async debug(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('debug', message, context)
  }

  async info(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('info', message, context)
  }

  async warn(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('warn', message, context)
  }

  async error(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('error', message, context)
  }

  async fatal(message: string, context?: Record<string, any>): Promise<Result<LogEntry, string>> {
    return this.log('fatal', message, context)
  }

  /**
   * Query logs
   */
  async queryLogs(query: LogQuery): Promise<Result<LogEntry[], string>> {
    try {
      let dbQuery = this.supabase
        .from('application_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      // Apply filters
      if (query.levels && query.levels.length > 0) {
        dbQuery = dbQuery.in('level', query.levels)
      }

      if (query.services && query.services.length > 0) {
        dbQuery = dbQuery.in('service', query.services)
      }

      if (query.timeRange) {
        dbQuery = dbQuery
          .gte('timestamp', query.timeRange.start)
          .lte('timestamp', query.timeRange.end)
      }

      if (query.traceId) {
        dbQuery = dbQuery.eq('trace_id', query.traceId)
      }

      if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId)
      }

      if (query.operation) {
        dbQuery = dbQuery.eq('operation', query.operation)
      }

      if (query.search) {
        dbQuery = dbQuery.ilike('message', `%${query.search}%`)
      }

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit)
      }

      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 100) - 1)
      }

      const { data, error } = await dbQuery

      if (error) {
        return failure(`Query failed: ${error.message}`)
      }

      const entries = data?.map(row => this.mapRowToLogEntry(row)) || []
      return success(entries)

    } catch (error) {
      return failure(`Log query failed: ${(error as Error).message}`)
    }
  }

  /**
   * Aggregate logs
   */
  async aggregateLogs(
    query: LogQuery,
    aggregation: LogAggregation
  ): Promise<Result<Array<{ timestamp: string; value: number }>, string>> {
    try {
      // This would typically use a time-series database like ClickHouse or Elasticsearch
      // For now, we'll do basic aggregation in PostgreSQL
      
      const { data, error } = await this.supabase.rpc('aggregate_logs', {
        query_params: query,
        aggregation_field: aggregation.field,
        aggregation_operation: aggregation.operation,
        time_interval: aggregation.interval || '1h'
      })

      if (error) {
        return failure(`Aggregation failed: ${error.message}`)
      }

      return success(data || [])

    } catch (error) {
      return failure(`Log aggregation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create log alert
   */
  async createAlert(alert: Omit<LogAlert, 'id'>): Promise<Result<LogAlert, string>> {
    try {
      const fullAlert: LogAlert = {
        id: nanoid(),
        ...alert
      }

      this.alerts.set(fullAlert.id, fullAlert)
      
      await this.supabase.from('log_alerts').insert({
        id: fullAlert.id,
        name: fullAlert.name,
        description: fullAlert.description,
        query: fullAlert.query,
        threshold: fullAlert.threshold,
        is_active: fullAlert.isActive,
        actions: fullAlert.actions,
        metadata: fullAlert.metadata
      })

      return success(fullAlert)

    } catch (error) {
      return failure(`Alert creation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Add log processor
   */
  addProcessor(processor: LogProcessor): void {
    this.processors.push(processor)
  }

  /**
   * Add log shipper
   */
  addShipper(shipper: LogShipper): void {
    this.shippers.push(shipper)
  }

  /**
   * Force flush buffer
   */
  async flush(): Promise<Result<void, string>> {
    if (this.logBuffer.length === 0) {
      return success(undefined)
    }

    try {
      const entries = [...this.logBuffer]
      this.logBuffer = []

      // Store in database
      const dbEntries = entries.map(entry => this.mapLogEntryToRow(entry))
      
      const { error } = await this.supabase
        .from('application_logs')
        .insert(dbEntries)

      if (error) {
        // Put entries back in buffer if failed
        this.logBuffer.unshift(...entries)
        return failure(`Flush failed: ${error.message}`)
      }

      // Ship to external systems
      for (const shipper of this.shippers) {
        await shipper.ship(entries)
      }

      this.emit('logsFlushed', entries.length)
      return success(undefined)

    } catch (error) {
      return failure(`Flush failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get logging statistics
   */
  getLoggingStats(): {
    bufferSize: number
    totalProcessors: number
    totalShippers: number
    activeAlerts: number
    logsByLevel: Record<LogLevel, number>
  } {
    return {
      bufferSize: this.logBuffer.length,
      totalProcessors: this.processors.length,
      totalShippers: this.shippers.length,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.isActive).length,
      logsByLevel: this.logBuffer.reduce((acc, entry) => {
        acc[entry.level] = (acc[entry.level] || 0) + 1
        return acc
      }, {} as Record<LogLevel, number>)
    }
  }

  /**
   * Private helper methods
   */
  private formatError(error: any): LogError {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      cause: error.cause
    }
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context }
    
    // Remove sensitive fields
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization']
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]'
      }
    }

    return sanitized
  }

  private extractTags(context: Record<string, any>, metadata: Record<string, any>): string[] {
    const tags: string[] = []
    
    if (context.userId) tags.push(`user:${context.userId}`)
    if (context.operation) tags.push(`operation:${context.operation}`)
    if (context.error) tags.push('error')
    if (metadata.feature) tags.push(`feature:${metadata.feature}`)
    
    return tags
  }

  private async checkAlerts(entry: LogEntry): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.isActive) continue

      if (this.matchesAlertQuery(entry, alert.query)) {
        const counterId = `${alert.id}_${Math.floor(Date.now() / (alert.threshold.timeWindow * 1000))}`
        
        let counter = this.alertCounters.get(counterId)
        if (!counter) {
          counter = { count: 0, windowStart: Date.now() }
          this.alertCounters.set(counterId, counter)
        }

        counter.count++

        if (this.evaluateThreshold(counter.count, alert.threshold)) {
          await this.triggerAlert(alert, entry, counter.count)
          this.alertCounters.delete(counterId)
        }
      }
    }
  }

  private matchesAlertQuery(entry: LogEntry, query: LogQuery): boolean {
    if (query.levels && !query.levels.includes(entry.level)) return false
    if (query.services && !query.services.includes(entry.service)) return false
    if (query.userId && entry.userId !== query.userId) return false
    if (query.operation && entry.operation !== query.operation) return false
    if (query.traceId && entry.traceId !== query.traceId) return false
    
    if (query.search) {
      const searchText = query.search.toLowerCase()
      if (!entry.message.toLowerCase().includes(searchText)) return false
    }

    if (query.tags && query.tags.length > 0) {
      const hasAllTags = query.tags.every(tag => entry.tags.includes(tag))
      if (!hasAllTags) return false
    }

    return true
  }

  private evaluateThreshold(count: number, threshold: LogAlert['threshold']): boolean {
    switch (threshold.operator) {
      case 'gt': return count > threshold.value
      case 'lt': return count < threshold.value
      case 'eq': return count === threshold.value
      case 'gte': return count >= threshold.value
      case 'lte': return count <= threshold.value
      default: return false
    }
  }

  private async triggerAlert(alert: LogAlert, entry: LogEntry, count: number): Promise<void> {
    alert.lastTriggered = new Date().toISOString()
    
    const alertEvent = {
      alertId: alert.id,
      alertName: alert.name,
      triggeringEntry: entry,
      eventCount: count,
      threshold: alert.threshold,
      timestamp: new Date().toISOString()
    }

    this.emit('alertTriggered', alertEvent)

    // Execute alert actions
    for (const action of alert.actions) {
      await this.executeAlertAction(action, alertEvent)
    }
  }

  private async executeAlertAction(action: LogAlertAction, alertEvent: any): Promise<void> {
    // This would integrate with external notification systems
    switch (action) {
      case 'email':
        this.emit('sendEmail', alertEvent)
        break
      case 'slack':
        this.emit('sendSlack', alertEvent)
        break
      case 'webhook':
        this.emit('sendWebhook', alertEvent)
        break
      case 'sms':
        this.emit('sendSMS', alertEvent)
        break
      case 'pagerduty':
        this.emit('sendPagerDuty', alertEvent)
        break
    }
  }

  private mapLogEntryToRow(entry: LogEntry): any {
    return {
      id: entry.id,
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      service: entry.service,
      version: entry.version,
      environment: entry.environment,
      trace_id: entry.traceId,
      span_id: entry.spanId,
      user_id: entry.userId,
      session_id: entry.sessionId,
      request_id: entry.requestId,
      operation: entry.operation,
      duration: entry.duration,
      error: entry.error,
      context: entry.context,
      metadata: entry.metadata,
      tags: entry.tags
    }
  }

  private mapRowToLogEntry(row: any): LogEntry {
    return {
      id: row.id,
      level: row.level,
      message: row.message,
      timestamp: row.timestamp,
      service: row.service,
      version: row.version,
      environment: row.environment,
      traceId: row.trace_id,
      spanId: row.span_id,
      userId: row.user_id,
      sessionId: row.session_id,
      requestId: row.request_id,
      operation: row.operation,
      duration: row.duration,
      error: row.error,
      context: row.context || {},
      metadata: row.metadata || {},
      tags: row.tags || []
    }
  }

  private setupProcessors(): void {
    // Add default processors
    this.addProcessor({
      name: 'enrichment',
      async process(entry: LogEntry): Promise<LogEntry | null> {
        // Add additional context
        entry.metadata.processedAt = new Date().toISOString()
        entry.metadata.hostname = process.env.HOSTNAME || 'unknown'
        return entry
      }
    })

    if (this.options.enableSampling) {
      this.addProcessor({
        name: 'sampling',
        async process(entry: LogEntry): Promise<LogEntry | null> {
          // Skip sampling for errors and warnings
          if (entry.level === 'error' || entry.level === 'warn' || entry.level === 'fatal') {
            return entry
          }
          
          return Math.random() < this.options.samplingRate ? entry : null
        }
      })
    }
  }

  private setupShippers(): void {
    // Add default shippers based on configuration
    if (process.env.ELASTICSEARCH_URL) {
      this.addShipper({
        name: 'elasticsearch',
        async ship(entries: LogEntry[]): Promise<Result<void, string>> {
          // Ship to Elasticsearch
          return success(undefined)
        }
      })
    }

    if (process.env.DATADOG_API_KEY) {
      this.addShipper({
        name: 'datadog',
        async ship(entries: LogEntry[]): Promise<Result<void, string>> {
          // Ship to Datadog
          return success(undefined)
        }
      })
    }
  }

  private setupFlushTimer(): void {
    setInterval(() => {
      this.flush()
    }, this.options.flushInterval)
  }

  private setupCleanupTasks(): void {
    // Clean up old alert counters every hour
    setInterval(() => {
      const now = Date.now()
      for (const [key, counter] of this.alertCounters.entries()) {
        if (now - counter.windowStart > 60 * 60 * 1000) { // 1 hour
          this.alertCounters.delete(key)
        }
      }
    }, 60 * 60 * 1000)

    // Clean up old logs daily
    setInterval(() => {
      this.cleanupOldLogs()
    }, 24 * 60 * 60 * 1000)
  }

  private async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date(Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000))
    
    await this.supabase
      .from('application_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
  }
}