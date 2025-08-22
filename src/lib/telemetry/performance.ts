/**
 * Enhanced Performance Monitoring
 * Advanced performance tracking with React profiling, database analysis, and bundle monitoring
 */

import { performanceMonitor } from '../monitoring/performance'
import { businessMetrics } from './business-metrics'
import { Logger } from '../logging/logger'

const logger = Logger.getLogger('EnhancedPerformance')

// Performance tracking interfaces
export interface ReactComponentMetrics {
  componentName: string
  renderTime: number
  mountTime: number
  updateTime: number
  unmountTime: number
  propsSize: number
  stateSize: number
  childrenCount: number
  rerenderCount: number
  isMemoryLeakCandidate: boolean
}

export interface DatabaseQueryMetrics {
  query: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'
  table: string
  executionTime: number
  rowsAffected: number
  queryPlan?: any
  indexesUsed: string[]
  isSlowQuery: boolean
  cacheHit: boolean
  connectionPoolStats: {
    activeConnections: number
    idleConnections: number
    totalConnections: number
    waitingClients: number
  }
}

export interface ApiEndpointMetrics {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  responseSize: number
  requestSize: number
  userAgent: string
  ipAddress?: string
  userId?: string
  organizationId?: string
  errorRate: number
  throughput: number
  concurrentRequests: number
}

export interface BundleAnalysisMetrics {
  totalSize: number
  gzippedSize: number
  chunks: {
    name: string
    size: number
    modules: number
    asyncChunks: number
  }[]
  unusedCode: {
    files: string[]
    totalSize: number
    percentage: number
  }
  dynamicImports: {
    route: string
    chunkSize: number
    loadTime: number
  }[]
  treeshakingEffectiveness: number
}

export interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
  memoryLeaks: {
    component: string
    leakType: 'event_listener' | 'interval' | 'subscription' | 'reference'
    severity: 'low' | 'medium' | 'high'
    description: string
  }[]
  gcMetrics: {
    minorGCCount: number
    majorGCCount: number
    totalGCTime: number
    avgGCTime: number
  }
}

// Enhanced Performance Monitor class
export class EnhancedPerformanceMonitor {
  private componentMetrics = new Map<string, ReactComponentMetrics>()
  private queryMetrics: DatabaseQueryMetrics[] = []
  private apiMetrics: ApiEndpointMetrics[] = []
  private memoryTracker = new MemoryTracker()
  private bundleAnalyzer = new BundleAnalyzer()
  private performanceObserver?: PerformanceObserver

  constructor() {
    this.initializePerformanceObserver()
    this.setupMemoryMonitoring()
  }

  /**
   * React Component Performance Profiling
   */
  profileReactComponent<T extends React.ComponentType<any>>(
    Component: T,
    componentName?: string
  ): T {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent'
    
    return class ProfiledComponent extends (Component as any) {
      private renderStartTime: number = 0
      private mountStartTime: number = 0
      private rerenderCount: number = 0

      componentDidMount() {
        const mountTime = performance.now() - this.mountStartTime
        this.updateComponentMetrics(name, { mountTime })
        
        if (super.componentDidMount) {
          super.componentDidMount()
        }
      }

      componentDidUpdate(prevProps: any, prevState: any) {
        this.rerenderCount++
        const updateTime = performance.now() - this.renderStartTime
        this.updateComponentMetrics(name, { 
          updateTime, 
          rerenderCount: this.rerenderCount 
        })

        // Check for unnecessary re-renders
        if (JSON.stringify(prevProps) === JSON.stringify(this.props) &&
            JSON.stringify(prevState) === JSON.stringify(this.state)) {
          logger.warn(`Unnecessary re-render detected in ${name}`)
        }

        if (super.componentDidUpdate) {
          super.componentDidUpdate(prevProps, prevState)
        }
      }

      componentWillUnmount() {
        const unmountTime = performance.now()
        this.updateComponentMetrics(name, { unmountTime })

        if (super.componentWillUnmount) {
          super.componentWillUnmount()
        }
      }

      render() {
        this.renderStartTime = performance.now()
        
        const result = super.render()
        
        const renderTime = performance.now() - this.renderStartTime
        const propsSize = this.calculateObjectSize(this.props)
        const stateSize = this.calculateObjectSize(this.state)
        const childrenCount = React.Children.count(result?.props?.children || result?.props?.child || 0)

        this.updateComponentMetrics(name, {
          renderTime,
          propsSize,
          stateSize,
          childrenCount
        })

        return result
      }

      private updateComponentMetrics(componentName: string, updates: Partial<ReactComponentMetrics>) {
        const existing = enhancedPerformanceMonitor.getComponentMetrics(componentName) || {
          componentName,
          renderTime: 0,
          mountTime: 0,
          updateTime: 0,
          unmountTime: 0,
          propsSize: 0,
          stateSize: 0,
          childrenCount: 0,
          rerenderCount: 0,
          isMemoryLeakCandidate: false
        }

        const updated = { ...existing, ...updates }
        
        // Check for memory leak indicators
        updated.isMemoryLeakCandidate = this.checkMemoryLeakIndicators(updated)
        
        enhancedPerformanceMonitor.recordComponentMetrics(updated)
      }

      private calculateObjectSize(obj: any): number {
        return JSON.stringify(obj || {}).length
      }

      private checkMemoryLeakIndicators(metrics: ReactComponentMetrics): boolean {
        return metrics.rerenderCount > 100 || 
               metrics.propsSize > 10000 || 
               metrics.stateSize > 10000 ||
               metrics.renderTime > 100
      }
    } as T
  }

  /**
   * Database Query Analysis
   */
  async profileDatabaseQuery<T>(
    query: string,
    operation: DatabaseQueryMetrics['operation'],
    table: string,
    executor: () => Promise<T>,
    options: {
      explainQuery?: boolean
      trackConnectionPool?: boolean
    } = {}
  ): Promise<T> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    let result: T
    let queryPlan: any
    let error: Error | null = null

    try {
      // Execute explain plan if requested
      if (options.explainQuery && typeof window === 'undefined') {
        try {
          // This would need to be implemented with actual database connection
          queryPlan = await this.explainQuery(query)
        } catch (explainError) {
          logger.warn('Failed to get query plan:', explainError)
        }
      }

      result = await executor()
      return result
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      throw err
    } finally {
      const executionTime = performance.now() - startTime
      const endMemory = process.memoryUsage()
      
      const metrics: DatabaseQueryMetrics = {
        query: this.sanitizeQuery(query),
        operation,
        table,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : result ? 1 : 0,
        queryPlan,
        indexesUsed: this.extractIndexesUsed(queryPlan),
        isSlowQuery: executionTime > 1000, // 1 second threshold
        cacheHit: false, // Would need cache implementation
        connectionPoolStats: options.trackConnectionPool ? await this.getConnectionPoolStats() : {
          activeConnections: 0,
          idleConnections: 0,
          totalConnections: 0,
          waitingClients: 0
        }
      }

      this.recordQueryMetrics(metrics)

      // Record business metrics
      businessMetrics.record('database_query_execution_time', executionTime, {
        operation,
        table,
        status: error ? 'error' : 'success',
        slow_query: metrics.isSlowQuery.toString()
      })

      // Alert on slow queries
      if (metrics.isSlowQuery) {
        logger.warn(`Slow query detected: ${table} ${operation}`, {
          executionTime,
          query: metrics.query,
          queryPlan
        })
      }
    }
  }

  /**
   * API Endpoint Monitoring
   */
  async profileApiEndpoint<T>(
    endpoint: string,
    method: string,
    handler: (req: any, res: any) => Promise<T>,
    req: any,
    res: any
  ): Promise<T> {
    const startTime = performance.now()
    const requestSize = this.calculateRequestSize(req)
    let responseSize = 0
    let statusCode = 200
    let error: Error | null = null

    try {
      const result = await handler(req, res)
      statusCode = res.statusCode || 200
      responseSize = this.calculateResponseSize(result)
      return result
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      statusCode = res.statusCode || 500
      throw err
    } finally {
      const responseTime = performance.now() - startTime
      
      const metrics: ApiEndpointMetrics = {
        endpoint: this.normalizeEndpoint(endpoint),
        method,
        responseTime,
        statusCode,
        responseSize,
        requestSize,
        userAgent: req.headers?.['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        errorRate: this.calculateErrorRate(endpoint, method),
        throughput: this.calculateThroughput(endpoint, method),
        concurrentRequests: this.getConcurrentRequests(endpoint)
      }

      this.recordApiMetrics(metrics)

      // Record to existing performance monitor
      await performanceMonitor.trackRequest({
        url: endpoint,
        method,
        userAgent: metrics.userAgent,
        userId: metrics.userId,
        organizationId: metrics.organizationId
      }, async () => ({ 
        result: null, 
        statusCode: metrics.statusCode 
      }))
    }
  }

  /**
   * Bundle Analysis and Code Splitting Monitoring
   */
  async analyzeBundlePerformance(): Promise<BundleAnalysisMetrics> {
    return this.bundleAnalyzer.analyze()
  }

  /**
   * Memory Usage and Leak Detection
   */
  startMemoryTracking(): void {
    this.memoryTracker.start()
  }

  stopMemoryTracking(): void {
    this.memoryTracker.stop()
  }

  getMemoryMetrics(): MemoryMetrics {
    return this.memoryTracker.getMetrics()
  }

  /**
   * Record component metrics
   */
  recordComponentMetrics(metrics: ReactComponentMetrics): void {
    this.componentMetrics.set(metrics.componentName, metrics)

    // Record to business metrics
    businessMetrics.record('component_render_time', metrics.renderTime, {
      component: metrics.componentName,
      memory_leak_candidate: metrics.isMemoryLeakCandidate.toString()
    })

    // Trim old metrics
    if (this.componentMetrics.size > 1000) {
      const oldestKey = this.componentMetrics.keys().next().value
      this.componentMetrics.delete(oldestKey)
    }
  }

  /**
   * Record query metrics
   */
  recordQueryMetrics(metrics: DatabaseQueryMetrics): void {
    this.queryMetrics.push(metrics)

    // Trim old metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.splice(0, this.queryMetrics.length - 1000)
    }
  }

  /**
   * Record API metrics
   */
  recordApiMetrics(metrics: ApiEndpointMetrics): void {
    this.apiMetrics.push(metrics)

    // Trim old metrics
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics.splice(0, this.apiMetrics.length - 1000)
    }
  }

  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard(timeRange?: { start: Date; end: Date }) {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const range = timeRange || { start: oneHourAgo, end: now }

    return {
      components: this.getComponentSummary(),
      database: this.getDatabaseSummary(range),
      api: this.getApiSummary(range),
      memory: this.getMemoryMetrics(),
      bundle: this.bundleAnalyzer.getCachedAnalysis(),
      alerts: this.getPerformanceAlerts()
    }
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(componentName: string): ReactComponentMetrics | undefined {
    return this.componentMetrics.get(componentName)
  }

  /**
   * Private helper methods
   */
  private initializePerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
            logger.debug('Performance entry:', entry)
          }
        }
      })

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] })
    }
  }

  private setupMemoryMonitoring(): void {
    if (typeof window === 'undefined') {
      // Server-side memory monitoring
      setInterval(() => {
        const memoryUsage = process.memoryUsage()
        businessMetrics.record('memory_heap_used', memoryUsage.heapUsed, {
          type: 'server'
        })
        
        if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
          logger.warn('High memory usage detected', memoryUsage)
        }
      }, 30000) // Every 30 seconds
    }
  }

  private async explainQuery(query: string): Promise<any> {
    // This would need actual database connection implementation
    // For now, return mock data
    return {
      planRows: [],
      estimatedCost: 0,
      estimatedRows: 0
    }
  }

  private extractIndexesUsed(queryPlan: any): string[] {
    // Extract indexes from query plan
    return []
  }

  private async getConnectionPoolStats() {
    // This would need actual connection pool implementation
    return {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      waitingClients: 0
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query for logging
    return query.replace(/('[^']*'|"[^"]*"|\$\d+)/g, '?').slice(0, 1000)
  }

  private normalizeEndpoint(endpoint: string): string {
    // Replace dynamic segments with placeholders
    return endpoint.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/g, '/:uuid')
  }

  private calculateRequestSize(req: any): number {
    return JSON.stringify(req.body || {}).length + JSON.stringify(req.query || {}).length
  }

  private calculateResponseSize(response: any): number {
    return JSON.stringify(response || {}).length
  }

  private calculateErrorRate(endpoint: string, method: string): number {
    const recentMetrics = this.apiMetrics.filter(m => 
      m.endpoint === endpoint && 
      m.method === method
    ).slice(-100) // Last 100 requests

    if (recentMetrics.length === 0) return 0

    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    return errorCount / recentMetrics.length
  }

  private calculateThroughput(endpoint: string, method: string): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentMetrics = this.apiMetrics.filter(m => 
      m.endpoint === endpoint && 
      m.method === method &&
      (now - oneMinuteAgo) < 60000 // Within last minute
    )

    return recentMetrics.length // Requests per minute
  }

  private getConcurrentRequests(endpoint: string): number {
    // This would need actual concurrency tracking
    return 0
  }

  private getComponentSummary() {
    const components = Array.from(this.componentMetrics.values())
    const slowComponents = components
      .filter(c => c.renderTime > 16) // Slower than 16ms (60fps)
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 10)

    const memoryLeakCandidates = components
      .filter(c => c.isMemoryLeakCandidate)

    return {
      total: components.length,
      slowComponents,
      memoryLeakCandidates,
      averageRenderTime: components.reduce((sum, c) => sum + c.renderTime, 0) / components.length || 0
    }
  }

  private getDatabaseSummary(timeRange: { start: Date; end: Date }) {
    const queries = this.queryMetrics
    const slowQueries = queries.filter(q => q.isSlowQuery)
    
    return {
      totalQueries: queries.length,
      slowQueries: slowQueries.length,
      averageExecutionTime: queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length || 0,
      mostUsedTables: this.getMostUsedTables(queries),
      slowestQueries: slowQueries.sort((a, b) => b.executionTime - a.executionTime).slice(0, 10)
    }
  }

  private getApiSummary(timeRange: { start: Date; end: Date }) {
    const requests = this.apiMetrics
    const errorRequests = requests.filter(r => r.statusCode >= 400)
    
    return {
      totalRequests: requests.length,
      errorCount: errorRequests.length,
      errorRate: errorRequests.length / requests.length || 0,
      averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length || 0,
      slowestEndpoints: this.getSlowestEndpoints(requests)
    }
  }

  private getMostUsedTables(queries: DatabaseQueryMetrics[]) {
    const tableCounts = new Map<string, number>()
    queries.forEach(q => {
      tableCounts.set(q.table, (tableCounts.get(q.table) || 0) + 1)
    })
    
    return Array.from(tableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([table, count]) => ({ table, count }))
  }

  private getSlowestEndpoints(requests: ApiEndpointMetrics[]) {
    const endpointTimes = new Map<string, { total: number; count: number }>()
    
    requests.forEach(r => {
      const key = `${r.method} ${r.endpoint}`
      const stats = endpointTimes.get(key) || { total: 0, count: 0 }
      stats.total += r.responseTime
      stats.count++
      endpointTimes.set(key, stats)
    })
    
    return Array.from(endpointTimes.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.total / stats.count,
        requestCount: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10)
  }

  private getPerformanceAlerts() {
    const alerts: string[] = []
    
    // Check for performance issues
    const memoryMetrics = this.getMemoryMetrics()
    if (memoryMetrics.heapUsed > 1024 * 1024 * 1024) {
      alerts.push('High memory usage detected')
    }
    
    if (memoryMetrics.memoryLeaks.length > 0) {
      alerts.push(`${memoryMetrics.memoryLeaks.length} potential memory leaks detected`)
    }
    
    const componentSummary = this.getComponentSummary()
    if (componentSummary.slowComponents.length > 5) {
      alerts.push(`${componentSummary.slowComponents.length} slow components detected`)
    }
    
    return alerts
  }
}

// Memory tracker class
class MemoryTracker {
  private isTracking = false
  private intervalId?: NodeJS.Timeout
  private memorySnapshots: { timestamp: Date; usage: NodeJS.MemoryUsage }[] = []
  private leakDetector = new MemoryLeakDetector()

  start(): void {
    if (this.isTracking || typeof window !== 'undefined') return

    this.isTracking = true
    this.intervalId = setInterval(() => {
      const usage = process.memoryUsage()
      this.memorySnapshots.push({
        timestamp: new Date(),
        usage
      })

      // Keep only last 100 snapshots
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots.splice(0, this.memorySnapshots.length - 100)
      }

      this.leakDetector.analyze(usage)
    }, 10000) // Every 10 seconds
  }

  stop(): void {
    if (!this.isTracking) return

    this.isTracking = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  getMetrics(): MemoryMetrics {
    const latest = this.memorySnapshots[this.memorySnapshots.length - 1]?.usage || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    }

    return {
      ...latest,
      memoryLeaks: this.leakDetector.getLeaks(),
      gcMetrics: this.getGCMetrics()
    }
  }

  private getGCMetrics() {
    // This would need GC monitoring implementation
    return {
      minorGCCount: 0,
      majorGCCount: 0,
      totalGCTime: 0,
      avgGCTime: 0
    }
  }
}

// Memory leak detector
class MemoryLeakDetector {
  private previousUsage?: NodeJS.MemoryUsage
  private increasingTrend = 0
  private leaks: MemoryMetrics['memoryLeaks'] = []

  analyze(currentUsage: NodeJS.MemoryUsage): void {
    if (!this.previousUsage) {
      this.previousUsage = currentUsage
      return
    }

    // Check for increasing memory trend
    const heapIncrease = currentUsage.heapUsed - this.previousUsage.heapUsed
    
    if (heapIncrease > 1024 * 1024) { // 1MB increase
      this.increasingTrend++
    } else {
      this.increasingTrend = Math.max(0, this.increasingTrend - 1)
    }

    // Potential memory leak if trend continues for 5 measurements
    if (this.increasingTrend >= 5) {
      this.leaks.push({
        component: 'system',
        leakType: 'reference',
        severity: 'medium',
        description: `Continuous memory increase detected: ${heapIncrease} bytes`
      })

      this.increasingTrend = 0 // Reset to avoid duplicate alerts
    }

    this.previousUsage = currentUsage
  }

  getLeaks(): MemoryMetrics['memoryLeaks'] {
    return this.leaks
  }
}

// Bundle analyzer class
class BundleAnalyzer {
  private cachedAnalysis?: BundleAnalysisMetrics

  async analyze(): Promise<BundleAnalysisMetrics> {
    // This would need actual webpack bundle analysis
    // For now, return mock data
    const analysis: BundleAnalysisMetrics = {
      totalSize: 2048000, // 2MB
      gzippedSize: 512000, // 512KB
      chunks: [
        {
          name: 'main',
          size: 1024000,
          modules: 150,
          asyncChunks: 5
        },
        {
          name: 'vendor',
          size: 512000,
          modules: 80,
          asyncChunks: 2
        }
      ],
      unusedCode: {
        files: [],
        totalSize: 0,
        percentage: 0
      },
      dynamicImports: [
        {
          route: '/dashboard',
          chunkSize: 256000,
          loadTime: 150
        }
      ],
      treeshakingEffectiveness: 85
    }

    this.cachedAnalysis = analysis
    return analysis
  }

  getCachedAnalysis(): BundleAnalysisMetrics | null {
    return this.cachedAnalysis || null
  }
}

// Global enhanced performance monitor instance
export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor()

// React component profiler HOC
export function withPerformanceProfiler<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  return enhancedPerformanceMonitor.profileReactComponent(Component, componentName)
}

// Database profiler decorator
export function ProfileQuery(operation: DatabaseQueryMetrics['operation'], table: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const query = args[0] || 'unknown'
      
      return enhancedPerformanceMonitor.profileDatabaseQuery(
        query,
        operation,
        table,
        () => method.apply(this, args)
      )
    }

    return descriptor
  }
}

// API profiler decorator  
export function ProfileApi(endpoint: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (req: any, res: any) {
      return enhancedPerformanceMonitor.profileApiEndpoint(
        endpoint,
        req.method,
        (r, rs) => method.apply(this, [r, rs]),
        req,
        res
      )
    }

    return descriptor
  }
}