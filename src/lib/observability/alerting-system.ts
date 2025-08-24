/**
 * Advanced Alerting System
 * Real-time monitoring, anomaly detection, and intelligent alerting
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from './metrics-collector'
import { DistributedTracer } from './distributed-tracer'
import { CentralizedLoggingManager } from './centralized-logging'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

// Core interfaces
export interface Alert {
  id: string
  name: string
  description: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  source: AlertSource
  conditions: AlertCondition[]
  actions: AlertAction[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  triggeredAt?: string
  resolvedAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  escalationLevel: number
  suppressionRules?: SuppressionRule[]
}

export type AlertType = 
  | 'threshold'
  | 'anomaly'
  | 'trend'
  | 'heartbeat'
  | 'error_rate'
  | 'performance'
  | 'security'
  | 'business'
  | 'infrastructure'

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'triggered' | 'acknowledged' | 'resolved' | 'suppressed'
export type AlertSource = 'metrics' | 'logs' | 'traces' | 'events' | 'external' | 'synthetic'

export interface AlertCondition {
  id: string
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'matches'
  value: any
  timeWindow: number // seconds
  evaluationWindow: number // seconds
  aggregation?: 'avg' | 'sum' | 'count' | 'min' | 'max' | 'p50' | 'p95' | 'p99'
  filters?: Record<string, any>
}

export interface AlertAction {
  type: AlertActionType
  config: Record<string, any>
  delay?: number // seconds
  repeatInterval?: number // seconds
  maxRepeats?: number
  conditions?: string[] // JavaScript expressions
}

export type AlertActionType = 
  | 'email'
  | 'slack' 
  | 'webhook'
  | 'sms'
  | 'pagerduty'
  | 'jira'
  | 'auto_scale'
  | 'restart_service'
  | 'circuit_breaker'

export interface SuppressionRule {
  id: string
  name: string
  conditions: Array<{
    field: string
    operator: string
    value: any
  }>
  duration: number // seconds
  isActive: boolean
}

export interface AlertIncident {
  id: string
  alertIds: string[]
  title: string
  description: string
  severity: AlertSeverity
  status: 'open' | 'investigating' | 'resolved'
  assignedTo?: string
  createdAt: string
  resolvedAt?: string
  timeline: IncidentTimelineEntry[]
  metrics: IncidentMetrics
  runbook?: string
}

export interface IncidentTimelineEntry {
  id: string
  timestamp: string
  type: 'created' | 'escalated' | 'acknowledged' | 'note_added' | 'resolved'
  message: string
  author?: string
  data?: Record<string, any>
}

export interface IncidentMetrics {
  mttr: number // Mean Time To Resolution
  mtta: number // Mean Time To Acknowledgment
  affectedUsers: number
  impactScore: number
}

export interface AnomalyDetectionConfig {
  algorithm: 'statistical' | 'machine_learning' | 'seasonal'
  sensitivity: 'low' | 'medium' | 'high'
  trainingPeriod: number // hours
  minimumDataPoints: number
  seasonalityPeriod?: number // hours
}

export interface NotificationChannel {
  id: string
  name: string
  type: AlertActionType
  config: Record<string, any>
  isActive: boolean
  rateLimits?: {
    maxPerMinute: number
    maxPerHour: number
    maxPerDay: number
  }
}

/**
 * Advanced Alerting Manager
 */
export class AdvancedAlertingManager extends EventEmitter {
  private alerts: Map<string, Alert> = new Map()
  private incidents: Map<string, AlertIncident> = new Map()
  private notificationChannels: Map<string, NotificationChannel> = new Map()
  private suppressionState: Map<string, number> = new Map() // alertId -> suppressedUntil
  private evaluationQueue: Array<{ alertId: string; scheduledAt: number }> = []
  private anomalyDetectors: Map<string, any> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private logger: CentralizedLoggingManager

  constructor(
    private supabase: SupabaseClient<Database>,
    logger: CentralizedLoggingManager,
    private options: {
      evaluationInterval: number
      maxConcurrentEvaluations: number
      defaultEscalationDelay: number
      incidentAutoResolve: boolean
      enableAnomalyDetection: boolean
      notificationRetryAttempts: number
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.logger = logger

    this.setupEvaluationLoop()
    this.setupAnomalyDetection()
    this.setupNotificationChannels()
    this.loadExistingAlerts()
  }

  /**
   * Create new alert rule
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt' | 'escalationLevel'>): Promise<Result<Alert, string>> {
    const span = this.tracer.startSpan('alerting_create_alert')

    try {
      const alert: Alert = {
        id: nanoid(),
        ...alertData,
        escalationLevel: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.alerts.set(alert.id, alert)
      
      await this.supabase.from('alert_rules').insert({
        id: alert.id,
        name: alert.name,
        description: alert.description,
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        conditions: alert.conditions,
        actions: alert.actions,
        metadata: alert.metadata,
        suppression_rules: alert.suppressionRules,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt
      })

      this.scheduleEvaluation(alert.id)
      await this.logger.info(`Alert rule created: ${alert.name}`, { alertId: alert.id })
      
      return success(alert)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Alert creation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Evaluate alert conditions
   */
  async evaluateAlert(alertId: string): Promise<Result<boolean, string>> {
    const span = this.tracer.startSpan('alerting_evaluate_alert')

    try {
      const alert = this.alerts.get(alertId)
      if (!alert || alert.status !== 'active') {
        return success(false)
      }

      // Check suppression
      if (this.isAlertSuppressed(alertId)) {
        return success(false)
      }

      let conditionsMet = true

      for (const condition of alert.conditions) {
        const result = await this.evaluateCondition(condition, alert.source)
        if (!result.success || !result.data) {
          conditionsMet = false
          break
        }
      }

      if (conditionsMet && alert.status === 'active') {
        await this.triggerAlert(alert)
      } else if (!conditionsMet && alert.status === 'triggered') {
        await this.resolveAlert(alert)
      }

      return success(conditionsMet)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Alert evaluation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(alert: Alert): Promise<Result<void, string>> {
    try {
      alert.status = 'triggered'
      alert.triggeredAt = new Date().toISOString()
      alert.updatedAt = new Date().toISOString()

      await this.updateAlertInDatabase(alert)
      
      // Execute actions
      for (const action of alert.actions) {
        if (this.shouldExecuteAction(action, alert)) {
          await this.executeAlertAction(action, alert)
        }
      }

      // Create or update incident
      await this.handleIncident(alert)

      this.metrics.recordAlertTriggered(alert.type, alert.severity)
      await this.logger.warn(`Alert triggered: ${alert.name}`, {
        alertId: alert.id,
        severity: alert.severity,
        type: alert.type
      })

      this.emit('alertTriggered', alert)
      return success(undefined)

    } catch (error) {
      return failure(`Alert trigger failed: ${(error as Error).message}`)
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<Result<void, string>> {
    try {
      const alert = this.alerts.get(alertId)
      if (!alert) {
        return failure('Alert not found')
      }

      alert.status = 'acknowledged'
      alert.acknowledgedAt = new Date().toISOString()
      alert.acknowledgedBy = userId
      alert.updatedAt = new Date().toISOString()

      await this.updateAlertInDatabase(alert)

      this.emit('alertAcknowledged', { alert, userId })
      return success(undefined)

    } catch (error) {
      return failure(`Alert acknowledgment failed: ${(error as Error).message}`)
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alert: Alert): Promise<Result<void, string>> {
    try {
      alert.status = 'resolved'
      alert.resolvedAt = new Date().toISOString()
      alert.updatedAt = new Date().toISOString()
      alert.escalationLevel = 0

      await this.updateAlertInDatabase(alert)

      this.metrics.recordAlertResolved(alert.type, alert.severity)
      await this.logger.info(`Alert resolved: ${alert.name}`, { alertId: alert.id })

      this.emit('alertResolved', alert)
      return success(undefined)

    } catch (error) {
      return failure(`Alert resolution failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create incident from alerts
   */
  async createIncident(alertIds: string[], title: string, description: string): Promise<Result<AlertIncident, string>> {
    try {
      const alerts = alertIds.map(id => this.alerts.get(id)).filter(Boolean) as Alert[]
      if (alerts.length === 0) {
        return failure('No valid alerts found')
      }

      const severity = this.calculateIncidentSeverity(alerts)
      
      const incident: AlertIncident = {
        id: nanoid(),
        alertIds,
        title,
        description,
        severity,
        status: 'open',
        createdAt: new Date().toISOString(),
        timeline: [{
          id: nanoid(),
          timestamp: new Date().toISOString(),
          type: 'created',
          message: `Incident created with ${alerts.length} alerts`
        }],
        metrics: {
          mttr: 0,
          mtta: 0,
          affectedUsers: 0,
          impactScore: this.calculateImpactScore(alerts)
        }
      }

      this.incidents.set(incident.id, incident)
      
      await this.supabase.from('alert_incidents').insert({
        id: incident.id,
        alert_ids: incident.alertIds,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        created_at: incident.createdAt,
        timeline: incident.timeline,
        metrics: incident.metrics
      })

      this.emit('incidentCreated', incident)
      return success(incident)

    } catch (error) {
      return failure(`Incident creation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Detect anomalies using statistical methods
   */
  async detectAnomalies(
    metric: string,
    values: number[],
    config: AnomalyDetectionConfig
  ): Promise<Result<Array<{ index: number; value: number; score: number }>, string>> {
    try {
      const anomalies: Array<{ index: number; value: number; score: number }> = []

      switch (config.algorithm) {
        case 'statistical':
          return this.detectStatisticalAnomalies(values, config)
        case 'machine_learning':
          return this.detectMLAnomalies(metric, values, config)
        case 'seasonal':
          return this.detectSeasonalAnomalies(values, config)
        default:
          return failure('Unknown anomaly detection algorithm')
      }

    } catch (error) {
      return failure(`Anomaly detection failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get alert statistics
   */
  getAlertingStats(): {
    totalAlerts: number
    alertsByStatus: Record<AlertStatus, number>
    alertsBySeverity: Record<AlertSeverity, number>
    alertsByType: Record<AlertType, number>
    activeIncidents: number
    averageResolutionTime: number
    topAlertingSources: string[]
  } {
    const alerts = Array.from(this.alerts.values())
    const incidents = Array.from(this.incidents.values())

    return {
      totalAlerts: alerts.length,
      alertsByStatus: this.groupBy(alerts, 'status'),
      alertsBySeverity: this.groupBy(alerts, 'severity'),
      alertsByType: this.groupBy(alerts, 'type'),
      activeIncidents: incidents.filter(i => i.status !== 'resolved').length,
      averageResolutionTime: this.calculateAverageResolutionTime(alerts),
      topAlertingSources: this.getTopAlertingSources(alerts)
    }
  }

  /**
   * Private helper methods
   */
  private async evaluateCondition(condition: AlertCondition, source: AlertSource): Promise<Result<boolean, string>> {
    try {
      switch (source) {
        case 'metrics':
          return this.evaluateMetricCondition(condition)
        case 'logs':
          return this.evaluateLogCondition(condition)
        case 'traces':
          return this.evaluateTraceCondition(condition)
        default:
          return failure(`Unsupported alert source: ${source}`)
      }
    } catch (error) {
      return failure(`Condition evaluation failed: ${(error as Error).message}`)
    }
  }

  private async evaluateMetricCondition(condition: AlertCondition): Promise<Result<boolean, string>> {
    const currentValue = await this.metrics.getMetricValue(
      condition.metric,
      condition.timeWindow,
      condition.aggregation
    )

    if (!currentValue.success) {
      return currentValue as any
    }

    const result = this.compareValues(currentValue.data, condition.operator, condition.value)
    return success(result)
  }

  private async evaluateLogCondition(condition: AlertCondition): Promise<Result<boolean, string>> {
    const logCount = await this.logger.queryLogs({
      search: condition.metric,
      timeRange: {
        start: new Date(Date.now() - condition.timeWindow * 1000).toISOString(),
        end: new Date().toISOString()
      }
    })

    if (!logCount.success) {
      return logCount as any
    }

    const result = this.compareValues(logCount.data.length, condition.operator, condition.value)
    return success(result)
  }

  private async evaluateTraceCondition(condition: AlertCondition): Promise<Result<boolean, string>> {
    // Implementation would query distributed tracing system
    return success(false)
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'gt': return Number(actual) > Number(expected)
      case 'lt': return Number(actual) < Number(expected)
      case 'eq': return actual === expected
      case 'gte': return Number(actual) >= Number(expected)
      case 'lte': return Number(actual) <= Number(expected)
      case 'contains': return String(actual).includes(String(expected))
      case 'matches': return new RegExp(expected).test(String(actual))
      default: return false
    }
  }

  private async executeAlertAction(action: AlertAction, alert: Alert): Promise<void> {
    try {
      switch (action.type) {
        case 'email':
          await this.sendEmailNotification(action, alert)
          break
        case 'slack':
          await this.sendSlackNotification(action, alert)
          break
        case 'webhook':
          await this.sendWebhookNotification(action, alert)
          break
        case 'pagerduty':
          await this.sendPagerDutyNotification(action, alert)
          break
        case 'auto_scale':
          await this.executeAutoScale(action, alert)
          break
        case 'circuit_breaker':
          await this.activateCircuitBreaker(action, alert)
          break
      }
    } catch (error) {
      await this.logger.error(`Alert action execution failed`, {
        alertId: alert.id,
        actionType: action.type,
        error: (error as Error).message
      })
    }
  }

  private async sendEmailNotification(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would send email via configured service
    this.emit('sendEmail', { action, alert })
  }

  private async sendSlackNotification(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would send Slack message
    this.emit('sendSlack', { action, alert })
  }

  private async sendWebhookNotification(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would send HTTP webhook
    this.emit('sendWebhook', { action, alert })
  }

  private async sendPagerDutyNotification(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would create PagerDuty incident
    this.emit('sendPagerDuty', { action, alert })
  }

  private async executeAutoScale(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would trigger auto-scaling
    this.emit('autoScale', { action, alert })
  }

  private async activateCircuitBreaker(action: AlertAction, alert: Alert): Promise<void> {
    // Implementation would activate circuit breaker
    this.emit('activateCircuitBreaker', { action, alert })
  }

  private shouldExecuteAction(action: AlertAction, alert: Alert): boolean {
    if (action.conditions) {
      // Evaluate JavaScript conditions
      return action.conditions.every(condition => {
        try {
          return new Function('alert', `return ${condition}`)(alert)
        } catch {
          return false
        }
      })
    }
    return true
  }

  private isAlertSuppressed(alertId: string): boolean {
    const suppressedUntil = this.suppressionState.get(alertId)
    return suppressedUntil ? suppressedUntil > Date.now() : false
  }

  private async handleIncident(alert: Alert): Promise<void> {
    // Find existing incident or create new one based on correlation rules
    const existingIncident = this.findCorrelatedIncident(alert)
    
    if (existingIncident) {
      existingIncident.alertIds.push(alert.id)
      existingIncident.timeline.push({
        id: nanoid(),
        timestamp: new Date().toISOString(),
        type: 'escalated',
        message: `Alert ${alert.name} added to incident`
      })
    } else {
      await this.createIncident([alert.id], alert.name, alert.description)
    }
  }

  private findCorrelatedIncident(alert: Alert): AlertIncident | null {
    // Simple correlation based on alert type and time window
    const recentIncidents = Array.from(this.incidents.values())
      .filter(i => 
        i.status !== 'resolved' && 
        new Date(i.createdAt).getTime() > Date.now() - 30 * 60 * 1000 // 30 minutes
      )

    return recentIncidents.find(incident => {
      const incidentAlerts = incident.alertIds.map(id => this.alerts.get(id)).filter(Boolean) as Alert[]
      return incidentAlerts.some(a => a.type === alert.type)
    }) || null
  }

  private calculateIncidentSeverity(alerts: Alert[]): AlertSeverity {
    const severityOrder = ['info', 'low', 'medium', 'high', 'critical']
    return alerts.reduce((maxSeverity, alert) => {
      const currentIndex = severityOrder.indexOf(alert.severity)
      const maxIndex = severityOrder.indexOf(maxSeverity)
      return currentIndex > maxIndex ? alert.severity : maxSeverity
    }, 'info' as AlertSeverity)
  }

  private calculateImpactScore(alerts: Alert[]): number {
    // Simple scoring based on alert count and severity
    return alerts.reduce((score, alert) => {
      const severityMultiplier = {
        'info': 1, 'low': 2, 'medium': 3, 'high': 4, 'critical': 5
      }[alert.severity]
      return score + severityMultiplier
    }, 0)
  }

  private detectStatisticalAnomalies(
    values: number[], 
    config: AnomalyDetectionConfig
  ): Result<Array<{ index: number; value: number; score: number }>, string> {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    const threshold = config.sensitivity === 'high' ? 2 : config.sensitivity === 'medium' ? 2.5 : 3
    
    const anomalies = values.map((value, index) => ({
      index,
      value,
      score: Math.abs(value - mean) / stdDev
    })).filter(item => item.score > threshold)

    return success(anomalies)
  }

  private detectMLAnomalies(
    metric: string, 
    values: number[], 
    config: AnomalyDetectionConfig
  ): Result<Array<{ index: number; value: number; score: number }>, string> {
    // Placeholder for ML-based anomaly detection
    return success([])
  }

  private detectSeasonalAnomalies(
    values: number[], 
    config: AnomalyDetectionConfig
  ): Result<Array<{ index: number; value: number; score: number }>, string> {
    // Placeholder for seasonal anomaly detection
    return success([])
  }

  private scheduleEvaluation(alertId: string): void {
    this.evaluationQueue.push({
      alertId,
      scheduledAt: Date.now() + this.options.evaluationInterval
    })
  }

  private setupEvaluationLoop(): void {
    setInterval(() => {
      this.processEvaluationQueue()
    }, this.options.evaluationInterval)
  }

  private async processEvaluationQueue(): Promise<void> {
    const now = Date.now()
    const readyToEvaluate = this.evaluationQueue
      .filter(item => item.scheduledAt <= now)
      .slice(0, this.options.maxConcurrentEvaluations)

    for (const item of readyToEvaluate) {
      this.evaluateAlert(item.alertId)
      this.scheduleEvaluation(item.alertId)
    }

    this.evaluationQueue = this.evaluationQueue.filter(item => item.scheduledAt > now)
  }

  private setupAnomalyDetection(): void {
    if (this.options.enableAnomalyDetection) {
      // Setup anomaly detection for key metrics
      setInterval(() => {
        this.runAnomalyDetection()
      }, 5 * 60 * 1000) // Every 5 minutes
    }
  }

  private async runAnomalyDetection(): Promise<void> {
    // Implementation would check key metrics for anomalies
  }

  private setupNotificationChannels(): void {
    // Setup default notification channels based on environment
  }

  private async loadExistingAlerts(): Promise<void> {
    const { data } = await this.supabase
      .from('alert_rules')
      .select('*')
      .eq('status', 'active')

    data?.forEach(row => {
      const alert: Alert = {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        severity: row.severity,
        status: row.status,
        source: row.source,
        conditions: row.conditions,
        actions: row.actions,
        metadata: row.metadata || {},
        suppressionRules: row.suppression_rules,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        escalationLevel: 0
      }
      this.alerts.set(alert.id, alert)
      this.scheduleEvaluation(alert.id)
    })
  }

  private async updateAlertInDatabase(alert: Alert): Promise<void> {
    await this.supabase
      .from('alert_rules')
      .update({
        status: alert.status,
        triggered_at: alert.triggeredAt,
        resolved_at: alert.resolvedAt,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        updated_at: alert.updatedAt
      })
      .eq('id', alert.id)
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const group = String(item[key])
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private calculateAverageResolutionTime(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter(a => a.resolvedAt && a.triggeredAt)
    if (resolvedAlerts.length === 0) return 0

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const trigger = new Date(alert.triggeredAt!).getTime()
      const resolved = new Date(alert.resolvedAt!).getTime()
      return sum + (resolved - trigger)
    }, 0)

    return totalTime / resolvedAlerts.length / 1000 // Convert to seconds
  }

  private getTopAlertingSources(alerts: Alert[]): string[] {
    const sourceCounts = this.groupBy(alerts, 'source')
    return Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source]) => source)
  }
}