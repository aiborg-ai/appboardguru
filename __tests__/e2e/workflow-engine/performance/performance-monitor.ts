/**
 * Performance Monitor for Workflow Testing
 * 
 * Monitors and analyzes performance metrics during end-to-end workflow testing.
 * Tracks response times, memory usage, throughput, and system resource utilization
 * across all integrated board meeting systems.
 */

import { WorkflowMetrics } from '../workflow-test-engine'

export interface PerformanceMonitorConfig {
  enabled: boolean
  thresholds?: PerformanceThresholds
  samplingInterval: number
  alertingEnabled?: boolean
}

export interface PerformanceThresholds {
  maxResponseTime: number
  maxMemoryUsage: number
  maxErrorRate: number
  minThroughput: number
}

export interface PerformanceAlert {
  timestamp: number
  metric: string
  value: number
  threshold: number
  severity: 'warning' | 'critical'
  message: string
}

export interface SystemResourceMetrics {
  cpu: {
    usage: number
    processes: ProcessCPUInfo[]
  }
  memory: {
    total: number
    used: number
    free: number
    cached?: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    connections: number
  }
  disk: {
    readOps: number
    writeOps: number
    readBytes: number
    writeBytes: number
  }
}

export interface ProcessCPUInfo {
  pid: number
  name: string
  cpuUsage: number
}

export interface PerformanceTrend {
  metric: string
  timeRange: { start: number; end: number }
  trend: 'improving' | 'degrading' | 'stable'
  changeRate: number
  confidence: number
}

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig
  private isRunning: boolean = false
  private samplingTimer: NodeJS.Timeout | null = null
  private metrics: Map<string, number[]> = new Map()
  private alerts: PerformanceAlert[] = []
  private startTime: number = 0
  private systemMetricsHistory: SystemResourceMetrics[] = []

  constructor(config: PerformanceMonitorConfig) {
    this.config = {
      alertingEnabled: true,
      ...config
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.startTime = Date.now()
    
    // Initialize metric collections
    this.initializeMetricCollections()

    // Start periodic sampling
    this.samplingTimer = setInterval(async () => {
      await this.collectSystemMetrics()
    }, this.config.samplingInterval)

    console.log('Performance monitoring started')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer)
      this.samplingTimer = null
    }

    console.log('Performance monitoring stopped')
  }

  private initializeMetricCollections(): void {
    const metricTypes = [
      'response_time',
      'memory_usage',
      'cpu_usage',
      'network_throughput',
      'error_rate',
      'concurrent_users'
    ]

    for (const metric of metricTypes) {
      this.metrics.set(metric, [])
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      const systemMetrics = await this.gatherSystemResourceMetrics()
      this.systemMetricsHistory.push(systemMetrics)

      // Keep only last 1000 samples to prevent memory bloat
      if (this.systemMetricsHistory.length > 1000) {
        this.systemMetricsHistory = this.systemMetricsHistory.slice(-1000)
      }

      // Record key metrics
      this.recordMetric('cpu_usage', systemMetrics.cpu.usage)
      this.recordMetric('memory_usage', systemMetrics.memory.used)
      this.recordMetric('network_throughput', systemMetrics.network.bytesIn + systemMetrics.network.bytesOut)

      // Check thresholds and generate alerts
      await this.checkThresholds(systemMetrics)

    } catch (error) {
      console.warn('Failed to collect system metrics:', error)
    }
  }

  private async gatherSystemResourceMetrics(): Promise<SystemResourceMetrics> {
    // Get Node.js process metrics
    const processMemory = process.memoryUsage()
    const processUsage = process.cpuUsage()

    // Mock system-level metrics (in real implementation, would use system monitoring libraries)
    const systemMetrics: SystemResourceMetrics = {
      cpu: {
        usage: this.calculateCPUUsage(processUsage),
        processes: [
          { pid: process.pid, name: 'playwright-test', cpuUsage: this.calculateCPUUsage(processUsage) }
        ]
      },
      memory: {
        total: 8 * 1024 * 1024 * 1024, // Mock 8GB total
        used: processMemory.heapUsed + processMemory.external,
        free: 8 * 1024 * 1024 * 1024 - (processMemory.heapUsed + processMemory.external),
        cached: processMemory.heapTotal - processMemory.heapUsed
      },
      network: {
        bytesIn: this.getNetworkBytesIn(),
        bytesOut: this.getNetworkBytesOut(),
        connections: this.getActiveConnections()
      },
      disk: {
        readOps: 0,
        writeOps: 0,
        readBytes: 0,
        writeBytes: 0
      }
    }

    return systemMetrics
  }

  private calculateCPUUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    return (cpuUsage.user + cpuUsage.system) / 1000000 // Convert microseconds to percentage
  }

  private getNetworkBytesIn(): number {
    // Mock network metrics - in real implementation would query system
    return Math.floor(Math.random() * 1000000)
  }

  private getNetworkBytesOut(): number {
    // Mock network metrics - in real implementation would query system  
    return Math.floor(Math.random() * 500000)
  }

  private getActiveConnections(): number {
    // Mock connection count
    return Math.floor(Math.random() * 100) + 10
  }

  recordMetric(metricName: string, value: number): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, [])
    }

    const values = this.metrics.get(metricName)!
    values.push(value)

    // Keep only recent values to prevent memory bloat
    if (values.length > 1000) {
      values.splice(0, values.length - 1000)
    }

    // Record timestamp-based metric for trending
    this.recordTimestampedMetric(metricName, value)
  }

  private recordTimestampedMetric(metricName: string, value: number): void {
    const timestampedKey = `${metricName}_timestamped`
    if (!this.metrics.has(timestampedKey)) {
      this.metrics.set(timestampedKey, [])
    }

    const timestampedValues = this.metrics.get(timestampedKey)!
    timestampedValues.push(Date.now(), value)

    // Keep only recent timestamped values
    if (timestampedValues.length > 2000) { // 1000 timestamp-value pairs
      timestampedValues.splice(0, timestampedValues.length - 2000)
    }
  }

  private async checkThresholds(metrics: SystemResourceMetrics): Promise<void> {
    if (!this.config.thresholds || !this.config.alertingEnabled) {
      return
    }

    const checks = [
      {
        metric: 'cpu_usage',
        value: metrics.cpu.usage,
        threshold: 80, // 80% CPU
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`
      },
      {
        metric: 'memory_usage',
        value: metrics.memory.used,
        threshold: this.config.thresholds.maxMemoryUsage,
        message: `High memory usage: ${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB`
      },
      {
        metric: 'network_throughput',
        value: metrics.network.bytesIn + metrics.network.bytesOut,
        threshold: 100 * 1024 * 1024, // 100MB/s
        message: `High network throughput: ${((metrics.network.bytesIn + metrics.network.bytesOut) / 1024 / 1024).toFixed(2)}MB/s`
      }
    ]

    for (const check of checks) {
      if (check.value > check.threshold) {
        await this.generateAlert({
          timestamp: Date.now(),
          metric: check.metric,
          value: check.value,
          threshold: check.threshold,
          severity: check.value > check.threshold * 1.2 ? 'critical' : 'warning',
          message: check.message
        })
      }
    }
  }

  private async generateAlert(alert: PerformanceAlert): Promise<void> {
    this.alerts.push(alert)

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Log alert
    console.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`)

    // In real implementation, could send notifications, trigger scaling, etc.
  }

  getMetricSummary(metricName: string): {
    count: number
    average: number
    min: number
    max: number
    latest: number
    percentiles: { p50: number; p95: number; p99: number }
  } {
    const values = this.metrics.get(metricName) || []
    
    if (values.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        latest: 0,
        percentiles: { p50: 0, p95: 0, p99: 0 }
      }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      count: values.length,
      average: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      latest: values[values.length - 1],
      percentiles: {
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      }
    }
  }

  analyzePerformanceTrends(timeRange?: { start: number; end: number }): PerformanceTrend[] {
    const trends: PerformanceTrend[] = []

    for (const [metricName] of this.metrics) {
      if (metricName.endsWith('_timestamped')) {
        continue // Skip timestamped raw data
      }

      const trend = this.analyzeSingleMetricTrend(metricName, timeRange)
      if (trend) {
        trends.push(trend)
      }
    }

    return trends
  }

  private analyzeSingleMetricTrend(metricName: string, timeRange?: { start: number; end: number }): PerformanceTrend | null {
    const timestampedKey = `${metricName}_timestamped`
    const timestampedData = this.metrics.get(timestampedKey) || []

    if (timestampedData.length < 4) { // Need at least 2 data points (timestamp + value pairs)
      return null
    }

    // Filter by time range if provided
    const filteredData: number[] = []
    for (let i = 0; i < timestampedData.length; i += 2) {
      const timestamp = timestampedData[i]
      const value = timestampedData[i + 1]

      if (!timeRange || (timestamp >= timeRange.start && timestamp <= timeRange.end)) {
        filteredData.push(timestamp, value)
      }
    }

    if (filteredData.length < 4) {
      return null
    }

    // Calculate trend using linear regression
    const dataPoints: Array<{ x: number; y: number }> = []
    for (let i = 0; i < filteredData.length; i += 2) {
      dataPoints.push({ x: filteredData[i], y: filteredData[i + 1] })
    }

    const trend = this.calculateLinearTrend(dataPoints)
    const actualTimeRange = timeRange || {
      start: Math.min(...filteredData.filter((_, i) => i % 2 === 0)),
      end: Math.max(...filteredData.filter((_, i) => i % 2 === 0))
    }

    return {
      metric: metricName,
      timeRange: actualTimeRange,
      trend: trend.slope > 0.1 ? 'degrading' : trend.slope < -0.1 ? 'improving' : 'stable',
      changeRate: trend.slope,
      confidence: trend.rSquared
    }
  }

  private calculateLinearTrend(dataPoints: Array<{ x: number; y: number }>): { slope: number; intercept: number; rSquared: number } {
    const n = dataPoints.length
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0)
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0)
    const sumXY = dataPoints.reduce((sum, point) => sum + (point.x * point.y), 0)
    const sumXX = dataPoints.reduce((sum, point) => sum + (point.x * point.x), 0)
    const sumYY = dataPoints.reduce((sum, point) => sum + (point.y * point.y), 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const yMean = sumY / n
    const totalSumSquares = dataPoints.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0)
    const residualSumSquares = dataPoints.reduce((sum, point) => {
      const predicted = slope * point.x + intercept
      return sum + Math.pow(point.y - predicted, 2)
    }, 0)

    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0

    return { slope, intercept, rSquared }
  }

  detectPerformanceAnomalies(): Array<{
    metric: string
    timestamp: number
    value: number
    expectedValue: number
    deviation: number
    severity: 'minor' | 'major' | 'critical'
  }> {
    const anomalies: Array<any> = []

    for (const [metricName] of this.metrics) {
      if (metricName.endsWith('_timestamped')) {
        continue
      }

      const values = this.metrics.get(metricName) || []
      if (values.length < 10) {
        continue // Need sufficient data for anomaly detection
      }

      // Use simple statistical anomaly detection (z-score)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const stdDev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length)

      // Check recent values for anomalies
      const recentValues = values.slice(-5) // Last 5 values
      for (let i = 0; i < recentValues.length; i++) {
        const value = recentValues[i]
        const zScore = Math.abs((value - mean) / stdDev)

        if (zScore > 2) { // 2 standard deviations
          anomalies.push({
            metric: metricName,
            timestamp: Date.now() - ((recentValues.length - 1 - i) * this.config.samplingInterval),
            value,
            expectedValue: mean,
            deviation: zScore,
            severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'major' : 'minor'
          })
        }
      }
    }

    return anomalies
  }

  async generateReport(workflowMetrics: WorkflowMetrics): Promise<string> {
    const report = {
      reportGenerated: new Date().toISOString(),
      testDuration: {
        start: new Date(workflowMetrics.startTime).toISOString(),
        end: workflowMetrics.endTime ? new Date(workflowMetrics.endTime).toISOString() : 'ongoing',
        durationMs: workflowMetrics.endTime ? workflowMetrics.endTime - workflowMetrics.startTime : Date.now() - workflowMetrics.startTime
      },
      performanceSummary: {
        responseTime: {
          summary: this.getMetricSummary('response_time'),
          byOperation: this.getResponseTimeByOperation(workflowMetrics.responseTimeMetrics)
        },
        memoryUsage: {
          summary: this.getMetricSummary('memory_usage'),
          trend: this.analyzeSingleMetricTrend('memory_usage'),
          peakUsage: Math.max(...(this.metrics.get('memory_usage') || [0]))
        },
        throughput: {
          summary: this.getMetricSummary('network_throughput'),
          averageRequestsPerSecond: this.calculateAverageThroughput(workflowMetrics.throughputMetrics)
        },
        errorRate: {
          totalErrors: workflowMetrics.errorMetrics.length,
          errorRate: this.calculateErrorRate(workflowMetrics),
          errorsByCategory: this.categorizeErrors(workflowMetrics.errorMetrics)
        },
        userInteractions: {
          totalInteractions: workflowMetrics.userInteractionMetrics.length,
          averageInteractionTime: this.calculateAverageInteractionTime(workflowMetrics.userInteractionMetrics),
          concurrencyPeaks: this.findConcurrencyPeaks(workflowMetrics.userInteractionMetrics)
        }
      },
      systemResourceUsage: {
        cpu: this.getLatestSystemMetric('cpu'),
        memory: this.getLatestSystemMetric('memory'), 
        network: this.getLatestSystemMetric('network')
      },
      performanceTrends: this.analyzePerformanceTrends(),
      anomalies: this.detectPerformanceAnomalies(),
      alerts: this.alerts.slice(-20), // Last 20 alerts
      recommendations: this.generatePerformanceRecommendations()
    }

    return JSON.stringify(report, null, 2)
  }

  private getResponseTimeByOperation(responseMetrics: any[]): Record<string, any> {
    const byOperation: Record<string, number[]> = {}
    
    for (const metric of responseMetrics) {
      if (!byOperation[metric.operation]) {
        byOperation[metric.operation] = []
      }
      byOperation[metric.operation].push(metric.responseTime)
    }

    const summary: Record<string, any> = {}
    for (const [operation, times] of Object.entries(byOperation)) {
      const sorted = times.sort((a, b) => a - b)
      summary[operation] = {
        count: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)]
      }
    }

    return summary
  }

  private calculateAverageThroughput(throughputMetrics: any[]): number {
    if (throughputMetrics.length === 0) return 0
    return throughputMetrics.reduce((sum, metric) => sum + metric.requestsPerSecond, 0) / throughputMetrics.length
  }

  private calculateErrorRate(workflowMetrics: WorkflowMetrics): number {
    const totalOperations = workflowMetrics.responseTimeMetrics.length
    const totalErrors = workflowMetrics.errorMetrics.length
    return totalOperations > 0 ? totalErrors / totalOperations : 0
  }

  private categorizeErrors(errorMetrics: any[]): Record<string, number> {
    const categories: Record<string, number> = {}
    
    for (const error of errorMetrics) {
      const category = error.operation || 'unknown'
      categories[category] = (categories[category] || 0) + 1
    }

    return categories
  }

  private calculateAverageInteractionTime(userInteractionMetrics: any[]): number {
    if (userInteractionMetrics.length === 0) return 0
    return userInteractionMetrics.reduce((sum, metric) => sum + metric.duration, 0) / userInteractionMetrics.length
  }

  private findConcurrencyPeaks(userInteractionMetrics: any[]): Array<{ timestamp: number; concurrentUsers: number }> {
    const peaks: Array<{ timestamp: number; concurrentUsers: number }> = []
    let maxConcurrency = 0

    for (const metric of userInteractionMetrics) {
      if (metric.concurrentUsers > maxConcurrency) {
        maxConcurrency = metric.concurrentUsers
        peaks.push({
          timestamp: metric.timestamp,
          concurrentUsers: metric.concurrentUsers
        })
      }
    }

    return peaks.slice(-10) // Return last 10 peaks
  }

  private getLatestSystemMetric(category: 'cpu' | 'memory' | 'network'): any {
    const latest = this.systemMetricsHistory[this.systemMetricsHistory.length - 1]
    return latest ? latest[category] : null
  }

  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = []

    // Memory usage recommendations
    const memoryMetrics = this.getMetricSummary('memory_usage')
    if (memoryMetrics.average > 1.5 * 1024 * 1024 * 1024) { // > 1.5GB
      recommendations.push('Consider optimizing memory usage - average usage is high')
    }

    // Response time recommendations  
    const responseMetrics = this.getMetricSummary('response_time')
    if (responseMetrics.average > 2000) { // > 2 seconds
      recommendations.push('Optimize response times - average response time exceeds 2 seconds')
    }

    // Error rate recommendations
    const errorMetrics = this.getMetricSummary('error_rate')
    if (errorMetrics.average > 0.01) { // > 1% error rate
      recommendations.push('Investigate and reduce error rates - current rate exceeds acceptable threshold')
    }

    // CPU usage recommendations
    const cpuMetrics = this.getMetricSummary('cpu_usage')
    if (cpuMetrics.average > 70) { // > 70% CPU
      recommendations.push('Consider CPU optimization or scaling - high CPU utilization detected')
    }

    // Add trend-based recommendations
    const trends = this.analyzePerformanceTrends()
    for (const trend of trends) {
      if (trend.trend === 'degrading' && trend.confidence > 0.7) {
        recommendations.push(`Performance degradation detected in ${trend.metric} - investigate root cause`)
      }
    }

    return recommendations.length > 0 ? recommendations : ['Performance metrics are within acceptable ranges']
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  clearAlerts(): void {
    this.alerts = []
  }

  getSystemMetricsHistory(): SystemResourceMetrics[] {
    return [...this.systemMetricsHistory]
  }
}