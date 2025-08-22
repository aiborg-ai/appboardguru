/**
 * Business Metrics System
 * Advanced telemetry for business-specific metrics with decorators and custom aggregations
 */

import { serverTelemetry } from './server'
import { clientTelemetry } from './client'

// Business metric types
export type BusinessMetricType = 
  | 'counter'
  | 'histogram' 
  | 'gauge'
  | 'summary'

export type BusinessDomain = 
  | 'governance'
  | 'compliance'
  | 'vault_access'
  | 'document_processing'
  | 'user_engagement'
  | 'meeting_effectiveness'
  | 'asset_management'
  | 'board_collaboration'

export interface BusinessMetricConfig {
  name: string
  type: BusinessMetricType
  domain: BusinessDomain
  description: string
  unit: string
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile'
  tags?: Record<string, string>
}

export interface BusinessMetricValue {
  value: number
  timestamp: Date
  labels: Record<string, string | number>
  context?: Record<string, unknown>
}

export interface ComplianceMetrics {
  documentsReviewed: number
  complianceViolations: number
  resolutionTime: number
  auditTrailCompleteness: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface GovernanceMetrics {
  boardMeetingAttendance: number
  decisionVelocity: number
  actionItemCompletion: number
  documentApprovalTime: number
  stakeholderEngagement: number
}

export interface VaultAccessMetrics {
  accessFrequency: number
  documentViewTime: number
  collaborationScore: number
  securityIncidents: number
  permissionChanges: number
}

// Business metrics registry
class BusinessMetricsRegistry {
  private metrics = new Map<string, BusinessMetricConfig>()
  private values = new Map<string, BusinessMetricValue[]>()
  private aggregations = new Map<string, any>()

  register(config: BusinessMetricConfig): void {
    this.metrics.set(config.name, config)
    this.values.set(config.name, [])
  }

  record(
    metricName: string,
    value: number,
    labels: Record<string, string | number> = {},
    context?: Record<string, unknown>
  ): void {
    const metric = this.metrics.get(metricName)
    if (!metric) {
      throw new Error(`Metric ${metricName} not registered`)
    }

    const metricValue: BusinessMetricValue = {
      value,
      timestamp: new Date(),
      labels,
      context
    }

    const values = this.values.get(metricName) || []
    values.push(metricValue)
    this.values.set(metricName, values)

    // Update aggregations
    this.updateAggregation(metricName, metricValue)

    // Send to telemetry
    this.sendToTelemetry(metric, metricValue)

    // Trim old values (keep last 1000 per metric)
    if (values.length > 1000) {
      values.splice(0, values.length - 1000)
    }
  }

  private updateAggregation(metricName: string, value: BusinessMetricValue): void {
    const metric = this.metrics.get(metricName)
    if (!metric?.aggregation) return

    const current = this.aggregations.get(metricName) || {
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
      values: []
    }

    current.sum += value.value
    current.count++
    current.min = Math.min(current.min, value.value)
    current.max = Math.max(current.max, value.value)
    current.values.push(value.value)

    // Keep only last 100 values for percentiles
    if (current.values.length > 100) {
      current.values.splice(0, current.values.length - 100)
    }

    this.aggregations.set(metricName, current)
  }

  private sendToTelemetry(config: BusinessMetricConfig, value: BusinessMetricValue): void {
    const telemetry = typeof window === 'undefined' ? serverTelemetry : clientTelemetry
    const tags = {
      domain: config.domain,
      metric_type: config.type,
      ...config.tags,
      ...value.labels
    }

    telemetry.recordBusinessMetric(config.name, value.value, tags)
  }

  getAggregation(metricName: string, type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p95' | 'p99'): number {
    const agg = this.aggregations.get(metricName)
    if (!agg) return 0

    switch (type) {
      case 'sum': return agg.sum
      case 'avg': return agg.count > 0 ? agg.sum / agg.count : 0
      case 'min': return agg.min === Infinity ? 0 : agg.min
      case 'max': return agg.max === -Infinity ? 0 : agg.max
      case 'count': return agg.count
      case 'p95': return this.percentile(agg.values, 0.95)
      case 'p99': return this.percentile(agg.values, 0.99)
      default: return 0
    }
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[index] || 0
  }

  getMetricSummary(metricName: string, timeRange?: { start: Date; end: Date }) {
    const values = this.values.get(metricName) || []
    const filteredValues = timeRange 
      ? values.filter(v => v.timestamp >= timeRange.start && v.timestamp <= timeRange.end)
      : values

    if (filteredValues.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 }
    }

    const sum = filteredValues.reduce((acc, v) => acc + v.value, 0)
    const min = Math.min(...filteredValues.map(v => v.value))
    const max = Math.max(...filteredValues.map(v => v.value))

    return {
      count: filteredValues.length,
      sum,
      avg: sum / filteredValues.length,
      min,
      max,
      p95: this.percentile(filteredValues.map(v => v.value), 0.95),
      p99: this.percentile(filteredValues.map(v => v.value), 0.99)
    }
  }
}

// Global registry instance
export const businessMetrics = new BusinessMetricsRegistry()

// Metric decorators
export function Metric(config: BusinessMetricConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    businessMetrics.register(config)
    
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      let error: Error | null = null
      let result: any

      try {
        result = await method.apply(this, args)
        return result
      } catch (err) {
        error = err instanceof Error ? err : new Error('Unknown error')
        throw err
      } finally {
        const duration = Date.now() - startTime
        const labels = {
          method: propertyName,
          class: target.constructor.name,
          status: error ? 'error' : 'success',
          ...(error && { error_type: error.constructor.name })
        }

        businessMetrics.record(config.name, duration, labels, {
          args: args.length,
          error_message: error?.message,
          result_type: typeof result
        })
      }
    }

    return descriptor
  }
}

export function Counter(domain: BusinessDomain, description: string, unit: string = 'count') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const config: BusinessMetricConfig = {
      name: `${domain}_${propertyName}_total`,
      type: 'counter',
      domain,
      description,
      unit,
      aggregation: 'sum'
    }

    return Metric(config)(target, propertyName, descriptor)
  }
}

export function Histogram(domain: BusinessDomain, description: string, unit: string = 'ms') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const config: BusinessMetricConfig = {
      name: `${domain}_${propertyName}_duration`,
      type: 'histogram',
      domain,
      description,
      unit,
      aggregation: 'avg'
    }

    return Metric(config)(target, propertyName, descriptor)
  }
}

// Pre-configured business metrics
export function initializeBusinessMetrics() {
  // Compliance metrics
  businessMetrics.register({
    name: 'compliance_document_reviews',
    type: 'counter',
    domain: 'compliance',
    description: 'Number of documents reviewed for compliance',
    unit: 'count',
    aggregation: 'sum'
  })

  businessMetrics.register({
    name: 'compliance_violations',
    type: 'counter',
    domain: 'compliance',
    description: 'Number of compliance violations detected',
    unit: 'count',
    aggregation: 'sum'
  })

  businessMetrics.register({
    name: 'compliance_resolution_time',
    type: 'histogram',
    domain: 'compliance',
    description: 'Time to resolve compliance issues',
    unit: 'hours',
    aggregation: 'avg'
  })

  // Governance metrics
  businessMetrics.register({
    name: 'meeting_attendance_rate',
    type: 'gauge',
    domain: 'governance',
    description: 'Board meeting attendance rate',
    unit: 'percentage',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'decision_velocity',
    type: 'histogram',
    domain: 'governance',
    description: 'Time from proposal to decision',
    unit: 'days',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'action_item_completion',
    type: 'gauge',
    domain: 'governance',
    description: 'Action item completion rate',
    unit: 'percentage',
    aggregation: 'avg'
  })

  // Vault access metrics
  businessMetrics.register({
    name: 'vault_access_frequency',
    type: 'counter',
    domain: 'vault_access',
    description: 'Frequency of vault access',
    unit: 'count',
    aggregation: 'sum'
  })

  businessMetrics.register({
    name: 'document_view_duration',
    type: 'histogram',
    domain: 'vault_access',
    description: 'Time spent viewing documents',
    unit: 'seconds',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'collaboration_score',
    type: 'gauge',
    domain: 'vault_access',
    description: 'Collaboration effectiveness score',
    unit: 'score',
    aggregation: 'avg'
  })

  // Document processing metrics
  businessMetrics.register({
    name: 'document_processing_time',
    type: 'histogram',
    domain: 'document_processing',
    description: 'Time to process documents',
    unit: 'seconds',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'document_approval_time',
    type: 'histogram',
    domain: 'document_processing',
    description: 'Time from upload to approval',
    unit: 'hours',
    aggregation: 'avg'
  })

  // User engagement metrics
  businessMetrics.register({
    name: 'user_session_duration',
    type: 'histogram',
    domain: 'user_engagement',
    description: 'User session duration',
    unit: 'minutes',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'feature_adoption_rate',
    type: 'gauge',
    domain: 'user_engagement',
    description: 'Rate of feature adoption',
    unit: 'percentage',
    aggregation: 'avg'
  })

  businessMetrics.register({
    name: 'user_retention_rate',
    type: 'gauge',
    domain: 'user_engagement',
    description: 'User retention rate',
    unit: 'percentage',
    aggregation: 'avg'
  })
}

// Business intelligence dashboard data
export function getBusinessIntelligenceDashboard(timeRange: { start: Date; end: Date }) {
  return {
    compliance: {
      documentsReviewed: businessMetrics.getAggregation('compliance_document_reviews', 'sum'),
      violations: businessMetrics.getAggregation('compliance_violations', 'sum'),
      avgResolutionTime: businessMetrics.getAggregation('compliance_resolution_time', 'avg'),
      trend: calculateTrend('compliance_violations', timeRange)
    },
    governance: {
      attendanceRate: businessMetrics.getAggregation('meeting_attendance_rate', 'avg'),
      decisionVelocity: businessMetrics.getAggregation('decision_velocity', 'avg'),
      actionItemCompletion: businessMetrics.getAggregation('action_item_completion', 'avg'),
      trend: calculateTrend('decision_velocity', timeRange)
    },
    vaultAccess: {
      accessFrequency: businessMetrics.getAggregation('vault_access_frequency', 'sum'),
      avgViewDuration: businessMetrics.getAggregation('document_view_duration', 'avg'),
      collaborationScore: businessMetrics.getAggregation('collaboration_score', 'avg'),
      trend: calculateTrend('vault_access_frequency', timeRange)
    },
    documentProcessing: {
      avgProcessingTime: businessMetrics.getAggregation('document_processing_time', 'avg'),
      avgApprovalTime: businessMetrics.getAggregation('document_approval_time', 'avg'),
      trend: calculateTrend('document_processing_time', timeRange)
    },
    userEngagement: {
      avgSessionDuration: businessMetrics.getAggregation('user_session_duration', 'avg'),
      featureAdoption: businessMetrics.getAggregation('feature_adoption_rate', 'avg'),
      retentionRate: businessMetrics.getAggregation('user_retention_rate', 'avg'),
      trend: calculateTrend('user_session_duration', timeRange)
    }
  }
}

function calculateTrend(metricName: string, timeRange: { start: Date; end: Date }): 'up' | 'down' | 'stable' {
  const summary = businessMetrics.getMetricSummary(metricName, timeRange)
  const previousPeriod = {
    start: new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime())),
    end: timeRange.start
  }
  const previousSummary = businessMetrics.getMetricSummary(metricName, previousPeriod)

  if (summary.avg > previousSummary.avg * 1.05) return 'up'
  if (summary.avg < previousSummary.avg * 0.95) return 'down'
  return 'stable'
}

// Export business metrics functions for use in services
export function recordComplianceMetric(type: keyof ComplianceMetrics, value: number, labels?: Record<string, string>) {
  const metricMapping = {
    documentsReviewed: 'compliance_document_reviews',
    complianceViolations: 'compliance_violations', 
    resolutionTime: 'compliance_resolution_time',
    auditTrailCompleteness: 'compliance_audit_completeness',
    riskLevel: 'compliance_risk_level'
  }

  const metricName = metricMapping[type]
  if (metricName) {
    businessMetrics.record(metricName, value, labels || {})
  }
}

export function recordGovernanceMetric(type: keyof GovernanceMetrics, value: number, labels?: Record<string, string>) {
  const metricMapping = {
    boardMeetingAttendance: 'meeting_attendance_rate',
    decisionVelocity: 'decision_velocity',
    actionItemCompletion: 'action_item_completion',
    documentApprovalTime: 'document_approval_time',
    stakeholderEngagement: 'stakeholder_engagement'
  }

  const metricName = metricMapping[type]
  if (metricName) {
    businessMetrics.record(metricName, value, labels || {})
  }
}

export function recordVaultAccessMetric(type: keyof VaultAccessMetrics, value: number, labels?: Record<string, string>) {
  const metricMapping = {
    accessFrequency: 'vault_access_frequency',
    documentViewTime: 'document_view_duration', 
    collaborationScore: 'collaboration_score',
    securityIncidents: 'vault_security_incidents',
    permissionChanges: 'vault_permission_changes'
  }

  const metricName = metricMapping[type]
  if (metricName) {
    businessMetrics.record(metricName, value, labels || {})
  }
}

// Initialize metrics on import
if (typeof window === 'undefined') {
  initializeBusinessMetrics()
}