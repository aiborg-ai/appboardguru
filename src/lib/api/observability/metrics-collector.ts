/**
 * Metrics Collector - Advanced Observability and Metrics Collection
 * Collects and aggregates performance, business, and operational metrics
 */

export interface MetricsConfig {
  enableMetrics: boolean
  enableTracing: boolean
  enableProfiling: boolean
  metricsInterval: number
  tracingSampleRate: number
  customMetrics: string[]
}

export interface RequestMetric {
  method: string
  path: string
  status: number
  duration: number
  protocol: string
  cacheHit: boolean
  timestamp?: number
}

export interface ErrorMetric {
  method: string
  path: string
  error: string
  duration: number
  timestamp?: number
}

export interface SystemMetrics {
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
    heapUsed: number
    heapTotal: number
  }
  network: {
    bytesIn: number
    bytesOut: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  uptime: number
  timestamp: number
}

export interface BusinessMetrics {
  activeUsers: number
  requestsPerSecond: number
  errorRate: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  cacheHitRate: number
  topEndpoints: Array<{ path: string; requests: number }>
  statusCodes: Record<number, number>
  userAgents: Record<string, number>
  countries: Record<string, number>
}

export class MetricsCollector {
  private requestMetrics: RequestMetric[] = []
  private errorMetrics: ErrorMetric[] = []
  private systemMetrics: SystemMetrics[] = []
  private businessMetrics: BusinessMetrics[] = []
  private config: MetricsConfig
  private metricsBuffer: Map<string, any[]> = new Map()
  private aggregationWindow = 60000 // 1 minute
  private retentionPeriod = 24 * 60 * 60 * 1000 // 24 hours

  constructor(config: MetricsConfig) {
    this.config = config
    this.initializeMetricsCollector()
  }

  private initializeMetricsCollector(): void {
    // Initialize metrics buffers
    this.metricsBuffer.set('requests', [])
    this.metricsBuffer.set('errors', [])
    this.metricsBuffer.set('system', [])
    this.metricsBuffer.set('business', [])

    // Start periodic cleanup
    setInterval(() => {
      this.cleanupOldMetrics()
    }, this.aggregationWindow)
  }

  /**
   * Record a request metric
   */
  recordRequest(metric: RequestMetric): void {
    if (!this.config.enableMetrics) return

    const timestampedMetric: RequestMetric = {
      ...metric,
      timestamp: Date.now()
    }

    this.requestMetrics.push(timestampedMetric)
    this.metricsBuffer.get('requests')?.push(timestampedMetric)

    // Update real-time counters
    this.updateRealTimeMetrics('request', timestampedMetric)
  }

  /**
   * Record an error metric
   */
  recordError(metric: ErrorMetric): void {
    if (!this.config.enableMetrics) return

    const timestampedMetric: ErrorMetric = {
      ...metric,
      timestamp: Date.now()
    }

    this.errorMetrics.push(timestampedMetric)
    this.metricsBuffer.get('errors')?.push(timestampedMetric)

    // Update real-time counters
    this.updateRealTimeMetrics('error', timestampedMetric)
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics(): void {
    if (!this.config.enableMetrics) return

    const metrics: SystemMetrics = {
      cpu: this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      network: this.getNetworkMetrics(),
      disk: this.getDiskMetrics(),
      uptime: process.uptime(),
      timestamp: Date.now()
    }

    this.systemMetrics.push(metrics)
    this.metricsBuffer.get('system')?.push(metrics)
  }

  /**
   * Get enhanced gateway statistics
   */
  async getEnhancedStats(): Promise<{
    requests: {
      total: number
      successful: number
      failed: number
      averageResponseTime: number
    }
    circuitBreakers: Record<string, {
      state: 'closed' | 'open' | 'half-open'
      failures: number
      successRate: number
    }>
    protocols: Record<string, number>
    security: {
      blockedRequests: number
      rateLimitHits: number
      authFailures: number
    }
    performance: {
      p50ResponseTime: number
      p95ResponseTime: number
      p99ResponseTime: number
      cacheHitRate: number
    }
  }> {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Filter recent metrics
    const recentRequests = this.requestMetrics.filter(m => (m.timestamp || 0) > oneHourAgo)
    const recentErrors = this.errorMetrics.filter(m => (m.timestamp || 0) > oneHourAgo)

    // Calculate basic request stats
    const totalRequests = recentRequests.length
    const successfulRequests = recentRequests.filter(m => m.status < 400).length
    const failedRequests = totalRequests - successfulRequests
    const averageResponseTime = recentRequests.reduce((sum, m) => sum + m.duration, 0) / totalRequests || 0

    // Calculate protocol distribution
    const protocols: Record<string, number> = {}
    recentRequests.forEach(m => {
      protocols[m.protocol] = (protocols[m.protocol] || 0) + 1
    })

    // Calculate performance percentiles
    const durations = recentRequests.map(m => m.duration).sort((a, b) => a - b)
    const p50ResponseTime = this.calculatePercentile(durations, 50)
    const p95ResponseTime = this.calculatePercentile(durations, 95)
    const p99ResponseTime = this.calculatePercentile(durations, 99)

    // Calculate cache hit rate
    const cacheHits = recentRequests.filter(m => m.cacheHit).length
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0

    // Security metrics (placeholder - would be tracked by security components)
    const security = {
      blockedRequests: recentErrors.filter(e => e.error.includes('blocked')).length,
      rateLimitHits: recentErrors.filter(e => e.error.includes('rate limit')).length,
      authFailures: recentErrors.filter(e => e.error.includes('auth')).length
    }

    return {
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        averageResponseTime
      },
      circuitBreakers: {}, // Would be populated by circuit breaker monitor
      protocols,
      security,
      performance: {
        p50ResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        cacheHitRate
      }
    }
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(timeRange?: { start: number; end: number }): BusinessMetrics {
    const now = Date.now()
    const start = timeRange?.start || (now - this.aggregationWindow)
    const end = timeRange?.end || now

    const filteredRequests = this.requestMetrics.filter(m => 
      (m.timestamp || 0) >= start && (m.timestamp || 0) <= end
    )

    // Calculate metrics
    const totalRequests = filteredRequests.length
    const timeSpan = (end - start) / 1000 // in seconds
    const requestsPerSecond = totalRequests / timeSpan

    const errors = filteredRequests.filter(m => m.status >= 400).length
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0

    const durations = filteredRequests.map(m => m.duration)
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0
    const p95ResponseTime = this.calculatePercentile(durations.sort((a, b) => a - b), 95)
    const p99ResponseTime = this.calculatePercentile(durations.sort((a, b) => a - b), 99)

    const cacheHits = filteredRequests.filter(m => m.cacheHit).length
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0

    // Top endpoints
    const endpointCounts: Record<string, number> = {}
    filteredRequests.forEach(m => {
      endpointCounts[m.path] = (endpointCounts[m.path] || 0) + 1
    })
    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, requests]) => ({ path, requests }))

    // Status codes distribution
    const statusCodes: Record<number, number> = {}
    filteredRequests.forEach(m => {
      statusCodes[m.status] = (statusCodes[m.status] || 0) + 1
    })

    return {
      activeUsers: this.estimateActiveUsers(filteredRequests),
      requestsPerSecond,
      errorRate,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      cacheHitRate,
      topEndpoints,
      statusCodes,
      userAgents: {}, // Would be populated from request headers
      countries: {} // Would be populated from IP geolocation
    }
  }

  /**
   * Get system metrics summary
   */
  getSystemMetricsSummary(): SystemMetrics | null {
    if (this.systemMetrics.length === 0) return null
    
    return this.systemMetrics[this.systemMetrics.length - 1]
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = []
    
    // Request metrics
    lines.push('# HELP http_requests_total Total number of HTTP requests')
    lines.push('# TYPE http_requests_total counter')
    
    const requestsByStatus: Record<string, number> = {}
    this.requestMetrics.forEach(m => {
      const key = `method="${m.method}",status="${m.status}",path="${m.path}"`
      requestsByStatus[key] = (requestsByStatus[key] || 0) + 1
    })
    
    Object.entries(requestsByStatus).forEach(([labels, count]) => {
      lines.push(`http_requests_total{${labels}} ${count}`)
    })

    // Response time histogram
    lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds')
    lines.push('# TYPE http_request_duration_seconds histogram')
    
    const durations = this.requestMetrics.map(m => m.duration / 1000) // Convert to seconds
    const buckets = [0.1, 0.5, 1, 2, 5, 10]
    
    buckets.forEach(bucket => {
      const count = durations.filter(d => d <= bucket).length
      lines.push(`http_request_duration_seconds_bucket{le="${bucket}"} ${count}`)
    })
    lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${durations.length}`)
    lines.push(`http_request_duration_seconds_sum ${durations.reduce((sum, d) => sum + d, 0)}`)
    lines.push(`http_request_duration_seconds_count ${durations.length}`)

    // System metrics
    const latestSystem = this.getSystemMetricsSummary()
    if (latestSystem) {
      lines.push('# HELP process_cpu_usage Process CPU usage percentage')
      lines.push('# TYPE process_cpu_usage gauge')
      lines.push(`process_cpu_usage ${latestSystem.cpu.usage}`)
      
      lines.push('# HELP process_memory_usage_bytes Process memory usage in bytes')
      lines.push('# TYPE process_memory_usage_bytes gauge')
      lines.push(`process_memory_usage_bytes ${latestSystem.memory.used}`)
    }

    return lines.join('\n')
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): Record<string, any> {
    const customMetrics: Record<string, any> = {}
    
    for (const metricName of this.config.customMetrics) {
      switch (metricName) {
        case 'request_duration':
          customMetrics[metricName] = this.calculateRequestDurationStats()
          break
        case 'error_rate':
          customMetrics[metricName] = this.calculateErrorRate()
          break
        case 'cache_hit_ratio':
          customMetrics[metricName] = this.calculateCacheHitRatio()
          break
        default:
          customMetrics[metricName] = null
      }
    }
    
    return customMetrics
  }

  private updateRealTimeMetrics(type: 'request' | 'error', metric: RequestMetric | ErrorMetric): void {
    // Update real-time counters (could be stored in Redis for distributed systems)
    // This would typically update gauges, counters, and histograms
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod
    
    this.requestMetrics = this.requestMetrics.filter(m => (m.timestamp || 0) > cutoff)
    this.errorMetrics = this.errorMetrics.filter(m => (m.timestamp || 0) > cutoff)
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff)
    
    // Cleanup metrics buffers
    this.metricsBuffer.forEach((buffer, key) => {
      this.metricsBuffer.set(key, buffer.filter((m: any) => (m.timestamp || 0) > cutoff))
    })
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    
    const index = (percentile / 100) * (sortedArray.length - 1)
    if (Number.isInteger(index)) {
      return sortedArray[index]
    }
    
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
  }

  private estimateActiveUsers(requests: RequestMetric[]): number {
    // Simple estimation based on unique IP addresses or user agents
    // In a real implementation, this would use session tracking
    const uniqueSources = new Set(requests.map(r => `${r.method}:${r.path}`)).size
    return Math.max(1, Math.floor(uniqueSources / 10)) // Rough estimation
  }

  private getCPUMetrics() {
    // Simplified CPU metrics (in a real implementation, use system monitoring)
    return {
      usage: Math.random() * 100, // Placeholder
      loadAverage: [1.2, 1.5, 1.8] // Placeholder
    }
  }

  private getMemoryMetrics() {
    const memoryUsage = process.memoryUsage()
    return {
      used: memoryUsage.rss,
      total: memoryUsage.rss * 2, // Placeholder
      percentage: (memoryUsage.rss / (memoryUsage.rss * 2)) * 100,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal
    }
  }

  private getNetworkMetrics() {
    // Placeholder network metrics
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000)
    }
  }

  private getDiskMetrics() {
    // Placeholder disk metrics
    return {
      used: Math.floor(Math.random() * 1000000000),
      total: 2000000000,
      percentage: Math.random() * 100
    }
  }

  private calculateRequestDurationStats() {
    const durations = this.requestMetrics.map(m => m.duration)
    if (durations.length === 0) return null
    
    const sorted = durations.sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99)
    }
  }

  private calculateErrorRate(): number {
    const totalRequests = this.requestMetrics.length
    const errors = this.requestMetrics.filter(m => m.status >= 400).length
    return totalRequests > 0 ? (errors / totalRequests) * 100 : 0
  }

  private calculateCacheHitRatio(): number {
    const totalRequests = this.requestMetrics.length
    const cacheHits = this.requestMetrics.filter(m => m.cacheHit).length
    return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0
  }
}